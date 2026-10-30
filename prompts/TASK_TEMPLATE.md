Use for a specific task (small model works best with this shape):

---
Task: T-4.1 fifo.ts
Read: docs/BLUEPRINT.md §3 and §5, docs/TESTING.md §A2
Create: src/logic/fifo.test.ts FIRST with every case in §A2, then src/logic/fifo.ts.
Rules: pure function, integers only, no DB, no new libraries.
Run: npx vitest run src/logic/fifo.test.ts --reporter=dot
Done when: all tests pass + tsc clean. Then update HANDOVER.md, tick T-4.1, commit "T-4.1: FIFO allocation".
---
