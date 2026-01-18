# UI Design Guidelines

## No Scrolling Policy

### Home Page
- **No vertical scrolling allowed**
- All content must fit within viewport height
- Use responsive design to adjust content size
- If content doesn't fit, make it responsive or reduce spacing
- Use `overflow: hidden` on main container if needed

### Modals
- **No scrolling in modals**
- All modal content must fit within modal bounds
- Use responsive layouts within modals
- Adjust font sizes and spacing to fit content
- If content is too large, break into tabs or steps

### Implementation Rules
1. **Home Page Container:**
   ```tsx
   <Box sx={{ height: '100vh', overflow: 'hidden' }}>
     {/* Content */}
   </Box>
   ```

2. **Modal Container:**
   ```tsx
   <Modal>
     <Box sx={{ maxHeight: '90vh', overflow: 'hidden' }}>
       {/* Content */}
     </Box>
   </Modal>
   ```

3. **Responsive Design:**
   - Use Material-UI breakpoints (xs, sm, md, lg, xl)
   - Adjust font sizes: `variant={{ xs: 'body2', md: 'body1' }}`
   - Adjust spacing: `spacing={{ xs: 1, md: 2 }}`
   - Use `flexWrap` for wrapping content

4. **Content Overflow Handling:**
   - Use tabs for multiple sections
   - Use accordions for collapsible content
   - Use pagination for long lists
   - Reduce padding/margins on smaller screens

### Border Styling
- Use thin borders: `borderWidth: 1`
- Use `variant="outlined"` for Paper components
- Border color: `borderColor: 'divider'`
- Keep borders aesthetically pleasing and minimal

### Examples
- ✅ Good: Content fits in viewport, no scroll needed
- ✅ Good: Responsive design adjusts to screen size
- ❌ Bad: Content overflows requiring scroll
- ❌ Bad: Fixed heights that don't adapt

---

**Last Updated:** 2024-01-16
**Status:** Active
