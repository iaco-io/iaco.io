# posts

one file per post. `001-my-intro.md` is served at /post/my-intro/ and /001/; `test.md` only at /post/test/.
images go in `src/media/`. the body is encrypted (`enc:v1:`); edit posts in /cms.

```md
---
title: abc
description: def
image: img.jpg
date: 2026-11-16
draft: true
alias:
  - ig
  - instagram
redirect: https://example.com
---
enc:v1:...
```
