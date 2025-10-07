# React 19.2 Feature Test Page

This test page demonstrates and verifies all Phase 1 and Phase 2 implementations of React 19.2 features.

## Access

Visit: **http://localhost:3000/test**

## What's Being Tested

### Phase 1: `cacheSignal`

**Data Fetching Section**
- ✅ Sanity integration with automatic request cleanup
- ✅ Shopify integration with timeout + cacheSignal
- Files: `integrations/sanity/fetch.ts`, `integrations/shopify/index.ts`

**Accordion with Activity**
- ✅ Accordion panels wrapped with `<Activity />`
- ✅ Effects cleanup when panels close
- ✅ Deferred updates for hidden content
- File: `components/accordion/index.tsx`

### Phase 2: `useEffectEvent`

**Scroll Trigger Hook**
- ✅ Callbacks don't trigger effect re-runs
- ✅ Cleaner dependency arrays
- ✅ Real-time progress tracking
- File: `hooks/use-scroll-trigger.ts`

**WebGL with Activity**
- ✅ 3D Box scene with viewport detection
- ✅ Animated gradients with visibility optimization
- ✅ Multiple scenes performance test
- Files: `app/(pages)/r3f/(components)/box/index.jsx`, `components/animated-gradient/index.tsx`

## Testing Instructions

### 1. Data Fetching
- Check console for configuration status
- Verify no "zombie requests" after cache expiry

### 2. Accordion
- Open browser console
- Open/close accordion panels
- Watch effect run counts in console
- Verify effects cleanup when panels close

### 3. Scroll Trigger
- Scroll through the page
- Watch progress bars fill as you scroll
- Open React DevTools Profiler to verify reduced re-renders

### 4. WebGL Scenes
- Scroll to WebGL sections (they're spaced out)
- Watch scenes activate ~200px before entering viewport
- Open Chrome DevTools → Performance tab
- Record profile with "React 19.2 Performance Tracks"
- Verify scenes defer updates when off-screen

## Performance Tracks (React 19.2)

To see React's internal work:

1. Open Chrome DevTools
2. Go to Performance tab
3. Click Record (●)
4. Scroll through the page
5. Stop recording
6. Look for:
   - **Scheduler ⚛** track - Shows priority work (blocking vs transitions)
   - **Components ⚛** track - Shows component render timing

## Expected Behavior

### Accordion
- ✅ Closed panels don't run effects
- ✅ Opening a panel re-mounts effects
- ✅ Console shows effect cleanup on close

### Scroll Trigger
- ✅ Smooth progress tracking
- ✅ No stuttering during scroll
- ✅ Reduced effect runs in React DevTools

### WebGL
- ✅ Scenes activate before fully visible (200px margin)
- ✅ Off-screen scenes pause rendering
- ✅ Multiple scenes don't impact performance
- ✅ GPU usage drops when scenes are hidden

## Files Created

```
app/(pages)/test/
├── page.tsx                              # Main test page
├── README.md                             # This file
└── sections/
    ├── index.ts                          # Section exports
    ├── accordion-test.tsx                # Accordion + Activity test
    ├── data-fetching-test.tsx            # cacheSignal integration test
    ├── scroll-trigger-test.tsx           # useEffectEvent scroll test
    └── webgl-test.tsx                    # WebGL + Activity test
```

## Troubleshooting

### Page doesn't load
- Check console for errors
- Verify all dependencies installed: `bun install`
- Restart dev server: `bun dev`

### WebGL scenes don't render
- Check if WebGL is enabled in your browser
- Verify Canvas component is working: visit `/r3f`

### Can't see performance tracks
- Use Chrome (not Firefox/Safari)
- React 19.2+ required
- Performance tab → Settings → enable "React Performance"

## Clean Up

This is a test page. To remove after testing:

```bash
rm -rf app/\(pages\)/test
```

---

**Last Updated:** October 7, 2025  
**React Version:** 19.2.0  
**Next.js Version:** 15.6.0-canary.49

