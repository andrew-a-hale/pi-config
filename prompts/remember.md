---
description: Summarize conversation and store in project memories
argument-hint: "<decisions|conventions|preferences>"
---
Read `.pi/memories/INDEX.md` and choose the best category for this memory: $1 (or pick one if not specified).

Review the conversation above. Extract the key insight, decision, convention, or preference that should be preserved. Write a single dated entry and append it to `.pi/memories/$1.md`.

Format:
```
YYYY-MM-DD — <concise entry>
```

If `$1` is a new category not in INDEX.md, create the file and update INDEX.md.

Do NOT summarize the whole conversation — capture only the one thing worth remembering. One entry per invocation.
