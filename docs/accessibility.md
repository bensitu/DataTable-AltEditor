# Accessibility

[Documentation](README.md) · [Dialog configuration](dialogs.md) · [Inline editing](inline-edit.md)

AltEditor provides named dialogs, labeled native fields, keyboard editing, focus restoration, and text feedback linked to invalid fields. Accessibility of a complete application also depends on its table navigation, chosen plugins, custom templates, styles, and persistence behavior.

## Keyboard access

Dialog frameworks manage focus containment. On opening, the editor focuses an available control; closing restores the previously focused element if it still exists. Close buttons provide keyboard dismissal. Escape and backdrop dismissal are intentionally disabled by the existing dialog configuration, including native mode. This differs from the Escape behavior recommended by the [ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/); applications should make the Close action easy to find.

Pending validation or persistence disables close and submit actions. Always bound external requests with a timeout and settle failures so the form remains recoverable. The editor does not impose a network timeout.

Double-click is the default pointer entry into inline editing. Provide a keyboard-accessible button or table navigation integration that calls `startInlineEdit()`. Do not rely on double-click alone. [Example 17](../example/17_inline_options/example17.html) demonstrates public edit controls, and [Example 21](../example/21_async_validation/example21.html) includes an **Edit first visible name** button. Inside an active control, Enter saves, Escape cancels an unsent edit, and Tab / Shift+Tab save and navigate eligible cells. See the [keyboard contract](inline-edit.md#keyboard-and-focus).

Row selection and toolbar accessibility belong to the DataTables configuration. When users cannot select rows with their keyboard, provide named per-row actions or accessible selection controls. [Example 12](../example/12_custom_action_buttons/example12.html) shows per-row actions. Application-rendered controls must have their own accessible names and keyboard behavior.

## Labels, feedback, and status

Generated labels reference unique field identifiers. Select2 selection and search controls receive field names; optional date and time pickers retain the labeled source input. Verify keyboard behavior for each third-party picker version used in the application.

Invalid fields receive `aria-invalid` and an error description without replacing existing descriptions. Errors render as text, with local messages for editable controls and global fallback for unavailable fields. Correcting a field clears its error. Forms expose `aria-busy` while collecting, validating, or saving; inline controls also expose busy state. Error messages use alert semantics. Use editor success/error events with an application status region when users need feedback outside the dialog after it closes.

Templates must preserve the generated field slots. Added instructions, custom controls outside those slots, and action buttons need appropriate names and associations. Do not use color alone to identify errors or required input.

## Contrast and layout

The default control border has approximately 3.55:1 contrast against the light dialog surface and 4.15:1 against the dark surface. Field errors also contain text, and focused controls have visible outlines. Select2 removal controls use the editor text color and a minimum 24 by 24 CSS pixel area. Its inline search field has a minimum width of 24 CSS pixels.

Use the [theme variables](styling.md#custom-properties) to customize appearance, and check contrast again whenever colors or backgrounds change. Preserve visible keyboard focus, readable labels, and usable controls at narrow widths and enlarged text. Long native forms scroll their body while retaining dialog actions.

## Verification status

The accessibility target is [WCAG 2.2 Level AA](https://www.w3.org/WAI/WCAG22/quickref/). This repository does not claim complete WCAG conformance for every integration.

During 4.2.0 verification, axe-core 4.13.0 checked the open dialogs in Examples 06, 11, 19, and 21 in both light and dark modes using WCAG A/AA rules through 2.2. Browser checks also cover focus, mobile layout, validation messages, correction, and keyboard editing. Automated checks found a missing Select2 search name; it was corrected along with error associations, border contrast, and small Select2 targets. These checks cover representative components, not all content and user journeys.

Before claiming conformance for an application, verify its complete workflows with a keyboard and the screen readers and browsers used by its audience. NVDA, VoiceOver, speech input, and all third-party picker interactions have not been comprehensively evaluated here. Table selection, pointer-only inline entry without an alternative, application colors, and unbounded network requests can still make an integration inaccessible. Automated checks cannot establish complete conformance.
