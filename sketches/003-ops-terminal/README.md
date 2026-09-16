## Variant: Ops Terminal

### Design stance
Utilitarian dense — a statusboard/terminal: one status bar, tabular fleet view, sparklines, live deploy log, and a command line as the primary input.

### Key choices
- Layout: top status bar + main column (fleet table, log) + right rail (risks, budgets)
- Typography: monospace everywhere, tabular numerals
- Color: severity-driven (green/amber/pink dots), cyan accent
- Interaction: command bar with hints, hover row highlight, clickable risk cards → war room

### Trade-offs
- Strong at: information density, ops credibility, at-a-glance health
- Weak at: warmth and storytelling; mono everywhere can feel cold

### Best for
The power user / demo-to-engineers scenario: "your entire agent org in one screen."
