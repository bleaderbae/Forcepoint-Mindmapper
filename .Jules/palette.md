## 2025-02-19 - Sidebar Accessibility Pattern
**Learning:** Adding `tabindex="0"`, `role="button"`, and `onkeydown` handlers to `div` based lists is a viable pattern for retrofitting accessibility without breaking existing flexbox layouts, but `aria-expanded` management requires careful syncing with state.
**Action:** When retrofitting interactive lists, always pair `aria-expanded` toggling with the visual state changes in both click and keyboard handlers.
