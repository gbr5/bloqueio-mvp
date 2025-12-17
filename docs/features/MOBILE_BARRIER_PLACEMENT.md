# Mobile Barrier Placement Feature

## Overview

This feature adds a mobile-specific barrier placement flow where users see a preview barrier they can tap-to-reposition before auto-confirmation, while keeping desktop behavior unchanged.

## User Flow

### Desktop (unchanged)
1. Enter wall mode → hover shows ghost preview
2. Click cell → validation + confirmation modal
3. Confirm/Cancel

### Mobile (new)
1. Enter wall mode → preview barrier appears at center (row 5, col 5)
2. Tap cells to reposition preview
3. After **5 seconds of inactivity** → auto-show confirmation modal
4. Confirm via existing modal, or Cancel to return to move mode

## Visual Feedback

| State | Visual |
|-------|--------|
| Valid preview position | Yellow highlight on cell + ghost barrier |
| Invalid preview position | Red highlight on cell (no ghost barrier) |
| Mobile hint | Status text shows "Toque para reposicionar" |

## Technical Implementation

### File Modified
- `/src/app/game.tsx` - All changes in this single file

### New State Added
```typescript
const [isMobile, setIsMobile] = useState<boolean>(false);
const [mobilePreviewBarrier, setMobilePreviewBarrier] = useState<{
  row: number;
  col: number;
} | null>(null);
const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

### Key Functions

1. **Mobile Detection** - Uses `window.innerWidth < 640` (Tailwind sm breakpoint)
2. **Preview Initialization** - Sets preview to center (5,5) when entering wall mode on mobile
3. **Inactivity Timer** - 5-second timeout triggers confirmation modal
4. **Tap-to-Reposition** - Cell clicks update preview position instead of immediate confirmation

### Changes Summary

| Location | Change |
|----------|--------|
| State section | Added `isMobile`, `mobilePreviewBarrier`, `inactivityTimeoutRef` |
| Effects | Added mobile detection, preview init, timer effects |
| `handleCellClick` | Added mobile branch to reposition preview |
| Orientation buttons | Added timer reset on orientation change |
| Ghost barrier rendering | Added mobile preview condition |
| `cancelBarrierPlacement` | Returns to move mode on mobile |
| Cell rendering | Added invalid position red highlight |
| Status text | Added mobile hint |

## Testing Checklist

### Desktop (should be unchanged)
- [ ] Enter wall mode → hover shows ghost preview
- [ ] Click → immediate validation and modal
- [ ] Cancel → stays in wall mode
- [ ] Confirm → places barrier, returns to move mode

### Mobile (new behavior)
- [ ] Enter wall mode → preview appears at center (5,5)
- [ ] Tap cell → preview moves to that position
- [ ] Wait 5 seconds → modal auto-appears
- [ ] Tap during preview → timer resets
- [ ] Change orientation → timer resets, preview updates orientation
- [ ] Cancel modal → returns to move mode
- [ ] Invalid position → shows red indicator (no ghost barrier)

### Edge Cases
- [ ] Orientation change while previewing
- [ ] Quick taps before timeout
- [ ] Border cells (should show invalid)
- [ ] Switching modes mid-preview
- [ ] Window resize desktop ↔ mobile

## Branch

Feature branch: `feature/mobile-barrier-placement`
