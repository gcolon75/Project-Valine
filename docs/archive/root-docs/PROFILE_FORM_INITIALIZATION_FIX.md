> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# ProfileEdit Form Initialization Fix

## Problem Statement

When users clicked "Edit Profile", the form would display with many fields empty even though the data existed in the backend. Worse, if a user edited just one field and saved, the empty inputs would overwrite the saved values with blanks, effectively deleting data.

## Root Cause

The original implementation had several issues:

1. **Wrong initialization source**: Form was initialized from `user` context (from AuthContext), which contained incomplete profile data
2. **Fallback merging**: When backend profile loaded, it merged with existing form values using `prev.field` fallbacks
3. **Stale data retention**: Empty backend fields kept stale values from user context
4. **No separation**: Profile data and form data were mixed, making it hard to track source of truth

### Original Code Flow

```javascript
// 1. Form initialized from user context (may be incomplete)
const [formData, setFormData] = useState({
  displayName: user?.displayName || '',
  username: user?.username || '',
  // ... more fields from user context
});

// 2. Backend profile loaded and merged with fallbacks
useEffect(() => {
  const profileData = await getMyProfile();
  setFormData(prev => ({
    ...prev,
    displayName: profileData.displayName || prev.displayName, // Keeps old value if backend is empty
    username: profileData.username || prev.username,
    // ... more fields with fallbacks
  }));
}, [user?.id]);

// 3. On save, formData sent to backend (may contain stale values)
await updateMyProfile(formData);
```

**Problem**: If backend returned empty `displayName`, the form kept the old value from user context. But if you then edited another field, the payload included the stale displayName, creating data inconsistency.

## Solution

Implemented a clean separation between profile data and form data with proper initialization:

### 1. Separate Profile State

```javascript
// Profile state - stores the full backend profile object
const [profile, setProfile] = useState(null);

// Form state - initialized from profile, not user context
const [formData, setFormData] = useState({
  displayName: '',
  username: '',
  // ... all fields start empty
});
```

### 2. Helper Functions

**mapProfileToForm()** - Maps backend profile to form structure:
```javascript
const mapProfileToForm = (profileData) => {
  return {
    displayName: profileData.displayName || '',
    username: profileData.username || '',
    title: profileData.title || '',
    bio: profileData.bio || '',
    // ... maps all fields with defaults for empty values
    primaryRoles: profileData.roles || [],
    skills: profileData.tags || [],
    profileLinks: profileData.socialLinks || [],
  };
};
```

**mapFormToProfileUpdate()** - Maps form data to update payload:
```javascript
const mapFormToProfileUpdate = (formData) => {
  return {
    displayName: formData.displayName,
    username: formData.username,
    title: formData.title,
    bio: formData.bio,
    roles: formData.primaryRoles,
    tags: formData.skills,
    socialLinks: formData.profileLinks,
    // ... includes all fields from form
  };
};
```

### 3. Single Initialization on Mount

```javascript
useEffect(() => {
  const loadProfile = async () => {
    // Only load once when we have user and haven't loaded yet
    if (user?.id && !profile && !initialFormData) {
      setIsLoadingProfile(true);
      try {
        const profileData = await getMyProfile();
        
        // Store full profile object
        setProfile(profileData);
        setProfileId(profileData.id);
        
        // Initialize form from profile using helper
        const mappedFormData = mapProfileToForm(profileData);
        setFormData(mappedFormData);
        setInitialFormData(mappedFormData); // For analytics
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoadingProfile(false);
      }
    }
  };

  loadProfile();
}, [user?.id, profile, initialFormData]); // Proper dependencies
```

### 4. Clean Save Logic

```javascript
const handleSave = async () => {
  // Sanitize form data
  const sanitizedData = {
    ...formData,
    displayName: sanitizeText(formData.displayName),
    title: sanitizeText(formData.title),
    // ... sanitize other fields
  };
  
  // Build update payload using helper
  const profileUpdate = mapFormToProfileUpdate(sanitizedData);
  
  // Send to backend
  await updateMyProfile(profileUpdate);
  
  // Refresh to ensure consistency
  await refreshUser();
};
```

## Benefits

### Before Fix
❌ Fields empty when opening Edit Profile  
❌ Editing one field overwrites others with blanks  
❌ Data loss on partial edits  
❌ Confusing mix of user context and backend data  
❌ Re-initialization on every render  

### After Fix
✅ All fields pre-filled with current backend data  
✅ Editing one field preserves others  
✅ No data loss  
✅ Clear separation: profile (backend) → form (UI)  
✅ Single initialization on mount  
✅ Helper functions ensure consistency  

## Technical Details

### Loading State
- Starts at `false` (no loading until fetch begins)
- Set to `true` when fetch starts
- Set to `false` when fetch completes or errors

### Dependency Array
Uses `[user?.id, profile, initialFormData]` to ensure:
- Runs when user ID becomes available
- Doesn't re-run if profile already loaded
- Doesn't re-run if form already initialized

### Error Handling
If profile fetch fails:
- Form stays empty (no stale data)
- User sees error toast
- Can navigate away and try again later

### Field Mapping Notes

**Special Cases:**
- `roles` (backend) ↔ `primaryRoles` (form)
- `tags` (backend) ↔ `skills` (form)
- `socialLinks` (backend) ↔ `profileLinks` (form)
- `banner` and `bannerUrl` both map to `bannerUrl` (backend) for compatibility

## Migration Notes

### No Breaking Changes
- Backend API unchanged
- Form behavior improved
- Data model unchanged
- User experience enhanced

### Testing
1. Open Edit Profile page → all fields pre-filled ✓
2. Edit one field → other fields remain ✓
3. Save changes → only edited field updated ✓
4. Refresh page → all changes persisted ✓

## Code Quality Improvements

1. **Separation of Concerns**: Profile data (source of truth) vs form data (UI state)
2. **Pure Functions**: Helper functions are pure, testable, reusable
3. **Single Responsibility**: Each helper does one thing well
4. **Predictable State**: Form only re-initializes when explicitly needed
5. **Better DX**: Clear data flow, easier to debug and maintain

## Future Enhancements

Potential improvements for future PRs:
1. Add retry button on profile load failure
2. Add form dirty state tracking
3. Add unsaved changes warning
4. Add field-level validation
5. Add auto-save on blur
6. Add form reset functionality
