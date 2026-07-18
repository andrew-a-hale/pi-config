# Isolate command

Use `/isolate <repo-url-or-path> <prompt>` to run a coding task in an ephemeral Docker container:

```
/isolate https://github.com/you/proj "fix null pointer in auth.ts, run tests, show git diff"
/isolate ~/projects/foo "add rate limiting to the API, run integration tests, show evidence"
```

What it does: clones repo → runs pi in container → commits + pushes changes → cleans up.
Use this for any code change you want sandboxed from the host.
