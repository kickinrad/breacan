---
name: use-kit
description: Put a Breacán kit's outputs into an app and keep the app on them. Use when adding a kit to a project, wiring its CSS, tokens or React Native theme into a stack, moving to a new kit release, or running breacan lint. Not for changing the kit itself (use make-kit) or one kit's own rules (use that kit's skill).
---

# Use a kit

An app reads a kit's outputs; it never redefines a value the kit defines.

1. **Install.** `mise use github:kickinrad/breacan`. When the kit ships a plugin, install it, then load that kit's skill: its rules win over this one.
2. **Wire the outputs** into the stack. Astro and EmDash import the CSS and use the variable names from token paths. A WordPress block theme maps the CSS properties into its `theme.json`; Themeco Pro maps them to its global colours and fonts. React Native imports the typed theme. Load the matching stack skill.
3. **Guard the app.** Run `breacan lint --rules <kit plugin>/skills/<kit>/references/breacan.rules.json <source paths>` in CI. It fails hand-typed values the kit defines and kit variables the kit lacks. It also fails a token used against its usage rule, and an emoji used as an icon. A deliberate local value carries `lint: own <why>`.
4. **Update** by taking the kit's newest release and rerunning the lint.

If lint flags a value the kit lacks, ask for it in the kit, through make-kit, rather than typing it locally.

Finish with the lint passing and the change looked at in the running app, in both modes.
