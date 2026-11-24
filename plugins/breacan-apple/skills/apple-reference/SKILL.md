---
name: apple-reference
description: Look up Apple's iOS Human Interface Guidelines and the Breacán Apple language. Use when a kit needs system colours, Dynamic Type, touch sizes, SF Symbols, native controls, bars, or sheets. Not for Material 3 (use material-reference).
---

# Apple reference

Answer Apple design questions from Apple's current guidance. Breacán's built-in language is `src/languages/apple.mjs` in [Breacán](https://github.com/kickinrad/breacan).

## Procedure

1. Read Apple's HIG page for the requested value and cite it beside that value.
2. Check [Color](https://developer.apple.com/design/human-interface-guidelines/color) for system colours and their dynamic API names.
3. Check [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) for SF Pro and Dynamic Type sizes.
4. Check [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) for control size and spacing.
5. Check [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), and [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) for shape, layout, and icons.
6. Check [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) for animation and depth.
7. Check [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), and [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) for system chrome.

Apple publishes no fixed corner, duration, or elevation token scale. Label Breacán's numeric scales as its design choices. For native controls, prefer the platform API over the static design token.

## Done when

Every reported Apple value has a current HIG link, and each design choice is identified as such.
