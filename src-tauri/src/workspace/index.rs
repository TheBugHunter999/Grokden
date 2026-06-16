use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::thread;

use ignore::WalkBuilder;
use parking_lot::RwLock;

use super::git::collect_git_status;
use super::search::fuzzy_score;
use super::types::{
    WorkspaceGitStatusMap, WorkspaceInfoDto, WorkspaceNodeDto, WorkspaceOpenResult, WorkspaceSearchHit,
};

const BUILTIN_IGNORED: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    "build",
    "target",
    ".svelte-kit",
];

#[derive(Debug, Clone)]
struct NodeRecord {
    name: String,
    path: String,
    parent_path: Option<String>,
    is_dir: bool,
    is_symlink: bool,
}

struct WorkspaceIndex {
    root: Option<PathBuf>,
    nodes: HashMap<String, NodeRecord>,
    children: HashMap<String, Vec<String>>,
    git: WorkspaceGitStatusMap,
    exclude_patterns: Vec<String>,
    indexing: bool,
    indexed_entries: usize,
    error: Option<String>,
    generation: u64,
}

impl Default for WorkspaceIndex {
    fn default() -> Self {
        Self {
            root: None,
            nodes: HashMap::new(),
            children: HashMap::new(),
            git: WorkspaceGitStatusMap::default(),
            exclude_patterns: Vec::new(),
            indexing: false,
            indexed_entries: 0,
            error: None,
            generation: 0,
        }
    }
}

pub struct WorkspaceState {
    inner: Arc<RwLock<WorkspaceIndex>>,
}

fn canonicalize_path(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        path.canonicalize()
            .map_err(|e| format!("Invalid path '{}': {e}", path.display()))
    } else {
        let file_name = path
            .file_name()
            .ok_or_else(|| format!("Invalid path '{}': missing file name", path.display()))?;
        let parent = path.parent().ok_or_else(|| {
            format!("Invalid path '{}': missing parent directory", path.display())
        })?;
        let canonical_parent = parent
            .canonicalize()
            .map_err(|e| format!("Invalid path '{}': {e}", path.display()))?;
        Ok(canonical_parent.join(file_name))
    }
}

fn is_path_within_root(resolved: &Path, root: &Path) -> bool {
    let root_components: Vec<_> = root.components().collect();
    let resolved_components: Vec<_> = resolved.components().collect();
    if resolved_components.len() < root_components.len() {
        return false;
    }
    resolved_components[..root_components.len()] == root_components[..]
}

impl WorkspaceState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(WorkspaceIndex::default())),
        }
    }

    /// Resolves and validates a path against the opened workspace root.
    /// When no workspace is open, returns the path unchanged (backward compatibility).
    pub fn resolve_workspace_path(&self, path: &str) -> Result<PathBuf, String> {
        let path = PathBuf::from(path);
        let root = self.inner.read().root.clone();
        let Some(root) = root else {
            return Ok(path);
        };

        let canonical_root = root
            .canonicalize()
            .map_err(|e| format!("Invalid workspace root: {e}"))?;
        let canonical_path = canonicalize_path(&path)?;

        if !is_path_within_root(&canonical_path, &canonical_root) {
            return Err("Path is outside the opened workspace".to_string());
        }

        Ok(canonical_path)
    }

    pub fn close(&self) {
        let mut index = self.inner.write();
        *index = WorkspaceIndex::default();
    }

    pub fn open(&self, root: String, exclude_patterns: Vec<String>) -> Result<WorkspaceOpenResult, String> {
        let root_path = PathBuf::from(&root);
        if !root_path.is_dir() {
            return Err("Workspace path is not a directory".to_string());
        }

        let root_str = root_path.to_string_lossy().to_string();
        let children = read_children_sync(&root_path, &root_str, &exclude_patterns)?;
        let git = collect_git_status(&root_path).unwrap_or_default();

        {
            let mut index = self.inner.write();
            index.root = Some(root_path.clone());
            index.exclude_patterns = exclude_patterns.clone();
            index.nodes.clear();
            index.children.clear();
            index.indexed_entries = 0;
            index.error = None;
            index.indexing = true;
            index.git = git;
            index.generation = index.generation.wrapping_add(1);
            merge_children_into_index(&mut index, &root_str, &children);
        }

        let (branch, changed_count, generation) = {
            let index = self.inner.read();
            (
                index.git.branch.clone(),
                index.git.changed_count,
                index.generation,
            )
        };

        let inner = Arc::clone(&self.inner);
        let root_for_thread = root_path.clone();
        let exclude = exclude_patterns;
        thread::spawn(move || run_full_index(inner, root_for_thread, exclude, generation));

        Ok(WorkspaceOpenResult {
            root: root_str,
            branch,
            changed_count,
            children,
            indexing: true,
        })
    }

    pub fn get_info(&self) -> WorkspaceInfoDto {
        let index = self.inner.read();
        WorkspaceInfoDto {
            root: index.root.as_ref().map(|p| p.to_string_lossy().to_string()),
            branch: index.git.branch.clone(),
            changed_count: index.git.changed_count,
            indexing: index.indexing,
            indexed_entries: index.indexed_entries,
            error: index.error.clone(),
        }
    }

    pub fn children(&self, parent_path: String) -> Result<Vec<WorkspaceNodeDto>, String> {
        let cached = {
            let index = self.inner.read();
            if let Some(child_paths) = index.children.get(&parent_path) {
                let mut out = Vec::with_capacity(child_paths.len());
                for path in child_paths {
                    if let Some(node) = index.nodes.get(path) {
                        out.push(node_to_dto(node));
                    }
                }
                if !out.is_empty() || index.indexing {
                    return Ok(out);
                }
            }
            index.exclude_patterns.clone()
        };

        let path = PathBuf::from(&parent_path);
        if !path.is_dir() {
            return Err("Path is not a directory".to_string());
        }

        let children = read_children_sync(&path, &parent_path, &cached)?;
        let mut index = self.inner.write();
        merge_children_into_index(&mut index, &parent_path, &children);
        Ok(children)
    }

    pub fn refresh(&self) -> Result<WorkspaceInfoDto, String> {
        let (root, exclude) = {
            let index = self.inner.read();
            (index.root.clone(), index.exclude_patterns.clone())
        };
        let Some(root_path) = root else {
            return Ok(self.get_info());
        };

        {
            let mut index = self.inner.write();
            index.indexing = true;
            index.error = None;
        }

        let generation = {
            let mut index = self.inner.write();
            index.generation = index.generation.wrapping_add(1);
            index.generation
        };
        let inner = Arc::clone(&self.inner);
        let exclude_clone = exclude.clone();
        thread::spawn(move || run_full_index(inner, root_path, exclude_clone, generation));
        Ok(self.get_info())
    }

    pub fn git_status_map(&self) -> WorkspaceGitStatusMap {
        let root = self.inner.read().root.clone();
        let Some(root_path) = root else {
            return WorkspaceGitStatusMap::default();
        };
        let git = collect_git_status(&root_path).unwrap_or_default();
        let mut index = self.inner.write();
        index.git = git.clone();
        git
    }

    pub fn search_fuzzy(&self, query: String, limit: u32) -> Vec<WorkspaceSearchHit> {
        let index = self.inner.read();
        let q = query.trim();
        if q.is_empty() {
            return Vec::new();
        }
        let limit = limit.max(1).min(200) as usize;
        let mut hits: Vec<WorkspaceSearchHit> = Vec::new();

        for node in index.nodes.values() {
            if node.is_dir {
                continue;
            }
            let Some(score) = fuzzy_score(q, &node.name).or_else(|| fuzzy_score(q, &node.path)) else {
                continue;
            };
            hits.push(WorkspaceSearchHit {
                path: node.path.clone(),
                name: node.name.clone(),
                score,
            });
        }

        hits.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.name.cmp(&b.name)));
        hits.truncate(limit);
        hits
    }
}

fn run_full_index(
    inner: Arc<RwLock<WorkspaceIndex>>,
    root: PathBuf,
    exclude_patterns: Vec<String>,
    generation: u64,
) {
    match walk_workspace(&root, &exclude_patterns) {
        Ok((nodes, children)) => {
            let git = collect_git_status(&root).unwrap_or_default();
            let mut index = inner.write();
            if index.generation != generation {
                return;
            }
            if index.root.as_deref() != Some(root.as_path()) {
                return;
            }
            index.nodes = nodes;
            index.children = children;
            index.indexed_entries = index.nodes.len();
            index.git = git;
            index.indexing = false;
            index.error = None;
        }
        Err(error) => {
            let mut index = inner.write();
            if index.generation != generation {
                return;
            }
            index.indexing = false;
            index.error = Some(error);
        }
    }
}

fn node_to_dto(node: &NodeRecord) -> WorkspaceNodeDto {
    WorkspaceNodeDto {
        name: node.name.clone(),
        path: node.path.clone(),
        parent_path: node.parent_path.clone(),
        is_dir: node.is_dir,
        is_symlink: node.is_symlink,
    }
}

fn is_glob_pattern(pat: &str) -> bool {
    pat.contains(['*', '?', '['])
}

fn glob_matches_basename(pattern: &str, name: &str) -> bool {
    let p: Vec<char> = pattern.chars().collect();
    let n: Vec<char> = name.chars().collect();
    glob_matches_at(&p, 0, &n, 0)
}

fn glob_matches_at(pattern: &[char], pi: usize, name: &[char], ni: usize) -> bool {
    if pi == pattern.len() {
        return ni == name.len();
    }
    match pattern[pi] {
        '*' => {
            for i in ni..=name.len() {
                if glob_matches_at(pattern, pi + 1, name, i) {
                    return true;
                }
            }
            false
        }
        '?' => {
            if ni < name.len() {
                glob_matches_at(pattern, pi + 1, name, ni + 1)
            } else {
                false
            }
        }
        ch => {
            if ni < name.len() && name[ni] == ch {
                glob_matches_at(pattern, pi + 1, name, ni + 1)
            } else {
                false
            }
        }
    }
}

fn pattern_matches_basename(name: &str, pat: &str) -> bool {
    if !pat.contains('/') && !is_glob_pattern(pat) {
        return name == pat;
    }

    for segment in pat.split('/') {
        if segment.is_empty() || segment == "**" {
            continue;
        }
        if is_glob_pattern(segment) {
            if glob_matches_basename(segment, name) {
                return true;
            }
        } else if name == segment {
            return true;
        }
    }
    false
}

fn should_skip_name(name: &str, exclude_patterns: &[String]) -> bool {
    if BUILTIN_IGNORED.contains(&name) {
        return true;
    }
    for pattern in exclude_patterns {
        let pat = pattern.trim();
        if pat.is_empty() {
            continue;
        }
        if pattern_matches_basename(name, pat) {
            return true;
        }
    }
    false
}

fn read_children_sync(
    dir: &Path,
    parent_str: &str,
    exclude_patterns: &[String],
) -> Result<Vec<WorkspaceNodeDto>, String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {e}"))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if should_skip_name(&name, exclude_patterns) {
            continue;
        }
        let path = entry.path().to_string_lossy().to_string();
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let is_symlink = file_type.is_symlink();
        let is_dir = if is_symlink {
            entry.metadata().map(|m| m.is_dir()).unwrap_or(false)
        } else {
            file_type.is_dir()
        };
        entries.push(WorkspaceNodeDto {
            name,
            path,
            parent_path: Some(parent_str.to_string()),
            is_dir,
            is_symlink,
        });
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

fn merge_children_into_index(index: &mut WorkspaceIndex, parent_str: &str, children: &[WorkspaceNodeDto]) {
    let mut paths = Vec::with_capacity(children.len());
    for child in children {
        let record = NodeRecord {
            name: child.name.clone(),
            path: child.path.clone(),
            parent_path: child.parent_path.clone(),
            is_dir: child.is_dir,
            is_symlink: child.is_symlink,
        };
        paths.push(child.path.clone());
        index.nodes.insert(child.path.clone(), record);
    }
    index.children.insert(parent_str.to_string(), paths);
    index.indexed_entries = index.nodes.len();
}

fn walk_workspace(
    root: &Path,
    exclude_patterns: &[String],
) -> Result<(HashMap<String, NodeRecord>, HashMap<String, Vec<String>>), String> {
    let mut nodes: HashMap<String, NodeRecord> = HashMap::new();
    let mut children: HashMap<String, Vec<String>> = HashMap::new();
    let root_str = root.to_string_lossy().to_string();

    let mut builder = WalkBuilder::new(root);
    let excludes = exclude_patterns.to_vec();
    builder
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .filter_entry(move |entry| {
            let name = entry.file_name().to_string_lossy();
            !should_skip_name(name.as_ref(), &excludes)
        });

    for result in builder.build() {
        let entry = result.map_err(|e| format!("Workspace walk failed: {e}"))?;
        let path = entry.path();
        if path == root {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if should_skip_name(&name, exclude_patterns) {
            continue;
        }
        let path_str = path.to_string_lossy().to_string();
        let parent = path
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| root_str.clone());

        let Some(file_type) = entry.file_type() else {
            continue;
        };
        let is_symlink = file_type.is_symlink();
        let is_dir = if is_symlink {
            entry.metadata().map(|m| m.is_dir()).unwrap_or(false)
        } else {
            file_type.is_dir()
        };

        let record = NodeRecord {
            name,
            path: path_str.clone(),
            parent_path: Some(parent.clone()),
            is_dir,
            is_symlink,
        };
        nodes.insert(path_str.clone(), record);
        children.entry(parent).or_default().push(path_str);
    }

    for child_list in children.values_mut() {
        child_list.sort_by(|a, b| {
            let a_dir = nodes.get(a).map(|n| n.is_dir).unwrap_or(false);
            let b_dir = nodes.get(b).map(|n| n.is_dir).unwrap_or(false);
            match (a_dir, b_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => {
                    let a_name = nodes.get(a).map(|n| n.name.to_lowercase()).unwrap_or_default();
                    let b_name = nodes.get(b).map(|n| n.name.to_lowercase()).unwrap_or_default();
                    a_name.cmp(&b_name)
                }
            }
        });
    }

    Ok((nodes, children))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static TEST_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "grokden_workspace_test_{}_{}",
            std::process::id(),
            TEST_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn workspace_open_lists_children() {
        let dir = temp_dir();
        fs::write(dir.join("a.txt"), "a").unwrap();
        fs::create_dir(dir.join("sub")).unwrap();

        let state = WorkspaceState::new();
        let result = state.open(dir.to_string_lossy().to_string(), Vec::new()).unwrap();
        assert_eq!(result.children.len(), 2);
        assert!(result.children.iter().any(|c| c.name == "sub" && c.is_dir));
    }

    #[test]
    fn resolve_workspace_path_allows_any_path_when_closed() {
        let state = WorkspaceState::new();
        let path = state
            .resolve_workspace_path("/some/arbitrary/path.txt")
            .expect("path allowed without workspace");
        assert_eq!(path, PathBuf::from("/some/arbitrary/path.txt"));
    }

    #[test]
    fn resolve_workspace_path_rejects_outside_workspace() {
        let dir = temp_dir();
        let outside = std::env::temp_dir().join(format!(
            "grokden_outside_{}_{}",
            std::process::id(),
            TEST_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&outside);
        fs::create_dir_all(&outside).expect("create outside dir");
        fs::write(outside.join("secret.txt"), "nope").expect("write outside file");

        let state = WorkspaceState::new();
        state
            .open(dir.to_string_lossy().to_string(), Vec::new())
            .expect("open workspace");

        let err = state
            .resolve_workspace_path(&outside.join("secret.txt").to_string_lossy())
            .expect_err("outside path should be rejected");
        assert!(err.contains("outside"));

        let _ = fs::remove_dir_all(&outside);
    }

    #[test]
    fn resolve_workspace_path_accepts_nested_workspace_file() {
        let dir = temp_dir();
        let nested = dir.join("src").join("main.rs");
        fs::create_dir_all(nested.parent().unwrap()).expect("create nested dir");
        fs::write(&nested, "fn main() {}").expect("write nested file");

        let state = WorkspaceState::new();
        state
            .open(dir.to_string_lossy().to_string(), Vec::new())
            .expect("open workspace");

        let resolved = state
            .resolve_workspace_path(&nested.to_string_lossy())
            .expect("nested file should resolve");
        assert!(resolved.ends_with("main.rs"));
    }

    #[test]
    fn should_skip_name_exact_match_only() {
        assert!(should_skip_name("dist", &[]));
        assert!(should_skip_name("node_modules", &[]));
        assert!(!should_skip_name("distinct.txt", &[]));
        assert!(!should_skip_name("my-dist", &["dist".to_string()]));
        assert!(should_skip_name("dist", &["dist".to_string()]));
        assert!(should_skip_name(".git", &["**/.git".to_string()]));
        assert!(!should_skip_name("bar.git", &["**/.git".to_string()]));
        assert!(!should_skip_name("foonode_modules", &["**/node_modules".to_string()]));
        assert!(should_skip_name("foo.js", &["**/*.js".to_string()]));
        assert!(!should_skip_name("foo.ts", &["**/*.js".to_string()]));
    }

    #[test]
    fn walk_workspace_prunes_ignored_directories() {
        let dir = temp_dir();
        fs::write(dir.join("distinct.txt"), "ok").unwrap();
        fs::create_dir_all(dir.join("node_modules").join("pkg")).unwrap();
        fs::write(dir.join("node_modules").join("pkg").join("index.js"), "").unwrap();
        fs::create_dir_all(dir.join("dist")).unwrap();
        fs::write(dir.join("dist").join("bundle.js"), "").unwrap();

        let (nodes, _) = walk_workspace(&dir, &[]).unwrap();
        let paths: Vec<_> = nodes.keys().cloned().collect();

        assert!(paths.iter().any(|p| p.ends_with("distinct.txt")));
        assert!(!paths.iter().any(|p| p.contains("node_modules")));
        assert!(!paths.iter().any(|p| p.contains("\\dist\\") || p.ends_with("\\dist")));
    }

    #[test]
    fn fuzzy_search_finds_file() {
        let dir = temp_dir();
        fs::write(dir.join("Button.tsx"), "").unwrap();

        let state = WorkspaceState::new();
        state.open(dir.to_string_lossy().to_string(), Vec::new()).unwrap();
        let generation = state.inner.read().generation;
        run_full_index(
            Arc::clone(&state.inner),
            dir.clone(),
            Vec::new(),
            generation,
        );

        let hits = state.search_fuzzy("btn".to_string(), 10);
        assert!(!hits.is_empty());
    }
}