> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# Education CRUD & UI Specification (v0.1)

## 1. Purpose

Implement an **Education** section in `ProfileEdit` that mirrors the existing **Experience** section:

- Full CRUD (Create, Read, Update, Delete) backed by API.
- Optimistic UI updates with rollback on failure.
- Shared error-handling via `extractErrorMessage`.
- Feature-parity with Experience, but with education-specific fields.

---

## 2. Data Model

Education item fields (frontend shape):

- `id: string`
- `institution: string` (school name)
- `program: string` (degree/program name)
- `startYear?: number | null` (year as integer)
- `endYear?: number | null` (year as integer or null for current)
- `achievements?: string | null` (description/notes)

Backend model (database schema):

- `id: string` (UUID)
- `profileId: string` (foreign key to Profile)
- `institution: string` (required)
- `program: string` (required)
- `startYear: integer` (nullable, range: 1900-2035)
- `endYear: integer` (nullable, range: 1900-2035)
- `achievements: text` (nullable)

**Note:** The spec originally called for fields like `school`, `degree`, `fieldOfStudy`, `location`, `startDate`, `endDate`, `isCurrent`, and `description`. The implementation uses a simplified model with `institution`, `program`, `startYear`, `endYear`, and `achievements` which better fits the theater/performing arts use case.

---

## 3. API Endpoints

Base path: `/me/profile/education`

All endpoints require authentication (JWT token in Authorization header or cookie).

### 3.1 GET /me/profile/education

**Description:** List all education entries for the authenticated user.

**Request:**
```
GET /me/profile/education
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
[
  {
    "id": "edu_abc123",
    "profileId": "profile_xyz789",
    "institution": "Juilliard School",
    "program": "BFA in Drama",
    "startYear": 2018,
    "endYear": 2022,
    "achievements": "Dean's List, Lead in senior production"
  },
  {
    "id": "edu_def456",
    "profileId": "profile_xyz789",
    "institution": "UC San Diego",
    "program": "B.S. Cognitive Science",
    "startYear": 2021,
    "endYear": null,
    "achievements": "Design & Interaction specialization"
  }
]
```

**Error responses:**
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Database error

**Notes:**
- Returns empty array `[]` if user has no education entries
- Returns empty array `[]` if user profile doesn't exist yet
- Ordered by `endYear DESC, startYear DESC`

---

### 3.2 POST /me/profile/education

**Description:** Create a new education entry for the authenticated user.

**Request:**
```
POST /me/profile/education
Authorization: Bearer <token>
Content-Type: application/json

{
  "institution": "Juilliard School",
  "program": "BFA in Drama",
  "startYear": 2018,
  "endYear": 2022,
  "achievements": "Dean's List, Lead in senior production"
}
```

**Request Body Fields:**
- `institution` (string, required) - School/institution name
- `program` (string, required) - Degree or program name
- `startYear` (integer, optional) - Start year (1900-2035)
- `endYear` (integer, optional) - End year (1900-2035), null for current
- `achievements` (string, optional) - Description, notes, achievements

**Response:** `201 Created`

```json
{
  "id": "edu_abc123",
  "profileId": "profile_xyz789",
  "institution": "Juilliard School",
  "program": "BFA in Drama",
  "startYear": 2018,
  "endYear": 2022,
  "achievements": "Dean's List, Lead in senior production"
}
```

**Error responses:**
- `400 Bad Request` - Validation error (missing required fields, invalid years, etc.)
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - Database error
- `503 Service Unavailable` - Database unavailable (degraded mode)

**Validation rules:**
- `institution` and `program` are required
- `startYear` and `endYear` must be integers between 1900 and (current year + 10)
- `startYear` cannot be after `endYear`
- If user profile doesn't exist, it will be auto-created

---

### 3.3 PUT /me/profile/education/:id

**Description:** Update an existing education entry. User must own the entry.

**Request:**
```
PUT /me/profile/education/edu_abc123
Authorization: Bearer <token>
Content-Type: application/json

{
  "institution": "Juilliard School",
  "program": "MFA in Drama",
  "startYear": 2022,
  "endYear": 2024,
  "achievements": "Merit scholarship recipient"
}
```

**Request Body Fields:**
All fields are optional - only include fields you want to update:
- `institution` (string) - School/institution name
- `program` (string) - Degree or program name
- `startYear` (integer) - Start year (1900-2035)
- `endYear` (integer) - End year (1900-2035)
- `achievements` (string) - Description, notes, achievements

**Response:** `200 OK`

```json
{
  "id": "edu_abc123",
  "profileId": "profile_xyz789",
  "institution": "Juilliard School",
  "program": "MFA in Drama",
  "startYear": 2022,
  "endYear": 2024,
  "achievements": "Merit scholarship recipient"
}
```

**Error responses:**
- `400 Bad Request` - Validation error (invalid years, startYear > endYear, etc.)
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User doesn't own this education entry
- `404 Not Found` - Education entry not found
- `500 Internal Server Error` - Database error
- `503 Service Unavailable` - Database unavailable (degraded mode)

**Validation rules:**
- Same as POST endpoint
- Ownership is verified via profile -> userId relationship

---

### 3.4 DELETE /me/profile/education/:id

**Description:** Delete an education entry. User must own the entry.

**Request:**
```
DELETE /me/profile/education/edu_abc123
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "message": "Education entry deleted successfully"
}
```

**Error responses:**
- `400 Bad Request` - Missing ID parameter
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - User doesn't own this education entry
- `404 Not Found` - Education entry not found
- `500 Internal Server Error` - Database error
- `503 Service Unavailable` - Database unavailable (degraded mode)

---

## 4. Frontend Services

Located in: `src/services/profileService.js`

### Service Functions

```javascript
/**
 * List education entries for the current user
 * @returns {Promise<Array>} Array of education entries
 */
export const listEducation = async () => {
  const { data } = await apiClient.get('/me/profile/education');
  return data;
};

/**
 * Create a new education entry
 * @param {Object} education - Education data
 * @returns {Promise<Object>} Created education entry
 */
export const createEducation = async (education) => {
  const { data } = await apiClient.post('/me/profile/education', education);
  return data;
};

/**
 * Update an education entry
 * @param {string} id - Education entry ID
 * @param {Object} updates - Education updates
 * @returns {Promise<Object>} Updated education entry
 */
export const updateEducation = async (id, updates) => {
  const { data } = await apiClient.put(`/me/profile/education/${id}`, updates);
  return data;
};

/**
 * Delete an education entry
 * @param {string} id - Education entry ID
 * @returns {Promise<Object>} Success response
 */
export const deleteEducation = async (id) => {
  const { data } = await apiClient.delete(`/me/profile/education/${id}`);
  return data;
};
```

### Error Handling

The frontend uses a consistent error extraction helper:

```javascript
const educationErrorMessage = (error, fallback) =>
  error?.response?.data?.message || 
  error?.response?.data?.error || 
  error?.message || 
  fallback;
```

This ensures user-friendly error messages are displayed in toast notifications.

---

## 5. UI: ProfileEdit – Education Section

### 5.1 Location

File: `src/pages/ProfileEdit.jsx`

The Education section is one of three main sections in ProfileEdit:

```javascript
const sections = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap }
];
```

Rendered when: `activeSection === 'education'`

### 5.2 State Management

```javascript
// Education state
const [educationList, setEducationList] = useState([]);
const [isLoadingEducation, setIsLoadingEducation] = useState(false);
const [editingEducation, setEditingEducation] = useState(null);
const [showEducationForm, setShowEducationForm] = useState(false);
```

**Loading on mount:**

```javascript
useEffect(() => {
  const loadEducation = async () => {
    if (user?.id) {
      setIsLoadingEducation(true);
      try {
        const data = await listEducation();
        const normalizedEducation = Array.isArray(data) 
          ? data 
          : (data?.education || []);
        setEducationList(normalizedEducation);
      } catch (error) {
        console.error('Failed to load education:', error);
      } finally {
        setIsLoadingEducation(false);
      }
    }
  };
  loadEducation();
}, [user?.id]);
```

### 5.3 UI Layout

**Section Structure:**
- **Loading state:** Shows "Loading education..." text
- **Empty state:** Shows "Add Education" button
- **List view:** Shows education entries with edit/delete buttons
- **Add form:** Inline form for creating new entries
- **Edit mode:** Inline form for editing existing entries

**Each education entry displays:**
- Institution (primary text, bold)
- Program (secondary text)
- Years (start year - end year or "Present")
- Achievements (optional, smaller text)
- Edit button (opens inline form)
- Delete button (with confirmation)

**Form fields:**
- Institution (required, text input)
- Program (required, text input)
- Start Year (optional, number input, 1900-2035)
- End Year (optional, number input, 1900-2035)
- Achievements/Notes (optional, textarea)
- Save and Cancel buttons

### 5.4 CRUD Operations

#### Create

**User flow:**
1. User clicks "Add Education" button
2. Inline form appears with empty fields
3. User fills in institution (required), program (required), and optional fields
4. User clicks "Save"
5. Frontend validates required fields and year ranges
6. API call: `createEducation(educationData)`
7. On success: New entry added to list, form hidden, success toast
8. On error: Error toast with message, form remains open

**Implementation:**

```javascript
const handleAddEducation = async (educationData) => {
  try {
    const result = await createEducation(educationData);
    const created = result?.education || result;
    setEducationList(prev => [...prev, created]);
    setShowEducationForm(false);
    toast.success('Education added!');
  } catch (error) {
    const message = educationErrorMessage(error, 'Failed to add education');
    toast.error(message);
  }
};
```

**Note:** This implementation does NOT use optimistic updates for create. The entry is only added to the list after successful API response.

#### Update

**User flow:**
1. User clicks Edit button on an education entry
2. Entry switches to inline edit mode with pre-filled form
3. User modifies fields
4. User clicks "Save"
5. Frontend validates fields and year ranges
6. API call: `updateEducation(id, updates)`
7. On success: Entry updated in list, form exits edit mode, success toast
8. On error: Error toast with message, form remains in edit mode

**Implementation:**

```javascript
const handleUpdateEducation = async (id, updates) => {
  try {
    const result = await updateEducation(id, updates);
    const updated = result?.education || result;
    setEducationList(prev => prev.map(e => e.id === id ? updated : e));
    setEditingEducation(null);
    toast.success('Education updated!');
  } catch (error) {
    const message = educationErrorMessage(error, 'Failed to update education');
    toast.error(message);
  }
};
```

**Note:** This implementation does NOT use optimistic updates for update. The entry is only updated after successful API response.

#### Delete

**User flow:**
1. User clicks Delete button on an education entry
2. Entry is immediately removed from the list
3. API call: `deleteEducation(id)`
4. On success: Success toast shown
5. On error: Error toast shown (entry remains deleted - no rollback)

**Implementation:**

```javascript
const handleDeleteEducation = async (id) => {
  try {
    await deleteEducation(id);
    setEducationList(prev => prev.filter(e => e.id !== id));
    toast.success('Education removed!');
  } catch (error) {
    toast.error('Failed to remove education');
  }
};
```

**Note:** The current implementation removes the entry optimistically but does NOT implement rollback on error. This is a deviation from the spec which called for optimistic updates with rollback.

### 5.5 Form Validation

**Client-side validation in EducationForm:**

1. **Required fields:**
   - Institution must not be empty
   - Program must not be empty
   - If either is missing, form submission is blocked silently

2. **Year range validation:**
   - Start year: 1900-2035
   - End year: 1900-2035
   - Error toast shown if out of range

3. **Year order validation:**
   - End year must be >= start year
   - Error toast shown if invalid

4. **Data normalization:**
   - Institution and program are trimmed
   - Years are converted to integers or null
   - Achievements is trimmed or converted to null if empty

**Example validation code:**

```javascript
// Validate year range
if (startYear && (startYear < 1900 || startYear > 2035)) {
  toast.error('Start year must be between 1900 and 2035');
  return;
}

if (endYear && (endYear < 1900 || endYear > 2035)) {
  toast.error('End year must be between 1900 and 2035');
  return;
}

// Validate end year >= start year
if (startYear && endYear && endYear < startYear) {
  toast.error('End year must be equal to or after start year');
  return;
}
```

---

## 6. Error Handling

### Error Message Extraction

Shared helper function used across ProfileEdit:

```javascript
const educationErrorMessage = (error, fallback) =>
  error?.response?.data?.message || 
  error?.response?.data?.error || 
  error?.message || 
  fallback;
```

### Error Scenarios

1. **Network error:** Generic fallback message shown
2. **Validation error (400):** Server error message shown (e.g., "startYear cannot be after endYear")
3. **Authentication error (401):** "Unauthorized" message
4. **Permission error (403):** "Forbidden - not education owner" message
5. **Not found (404):** "Education entry not found" message
6. **Server error (500):** "Server error: [message]" shown
7. **Database unavailable (503):** "Database unavailable" message

### Error Display

All errors are displayed via `react-hot-toast`:

```javascript
toast.error(message);
```

Toast notifications appear at the top of the screen and auto-dismiss after a few seconds.

---

## 7. Testing

### Backend Tests

Location: `serverless/src/handlers/__tests__/` (if exists)

**Recommended test cases:**

1. **listEducation:**
   - Returns empty array when user has no education
   - Returns empty array when profile doesn't exist
   - Returns education ordered by endYear DESC, startYear DESC
   - Returns 401 when not authenticated

2. **createEducation:**
   - Creates education with all fields
   - Creates education with only required fields
   - Auto-creates profile if doesn't exist
   - Returns 400 when institution missing
   - Returns 400 when program missing
   - Returns 400 when startYear invalid
   - Returns 400 when endYear invalid
   - Returns 400 when startYear > endYear

3. **updateEducation:**
   - Updates education with partial fields
   - Returns 404 when education not found
   - Returns 403 when user doesn't own education
   - Validates year ranges like POST

4. **deleteEducation:**
   - Deletes education successfully
   - Returns 404 when education not found
   - Returns 403 when user doesn't own education

### Frontend Tests

Location: `src/pages/__tests__/` or `src/services/__tests__/`

**Service tests:**

```javascript
describe('profileService - education', () => {
  it('listEducation returns education array', async () => {
    // Mock apiClient.get
    // Assert returns array
  });

  it('createEducation sends POST request', async () => {
    // Mock apiClient.post
    // Assert correct payload sent
  });

  it('updateEducation sends PUT request', async () => {
    // Mock apiClient.put
    // Assert correct payload and ID
  });

  it('deleteEducation sends DELETE request', async () => {
    // Mock apiClient.delete
    // Assert correct ID
  });
});
```

**Component tests:**

```javascript
describe('ProfileEdit - Education', () => {
  it('renders education section when active', () => {
    // Render with activeSection='education'
    // Assert section visible
  });

  it('displays loading state', () => {
    // Render with isLoadingEducation=true
    // Assert "Loading education..." shown
  });

  it('displays education list', () => {
    // Render with educationList populated
    // Assert entries displayed with institution, program, years
  });

  it('opens add form when button clicked', () => {
    // Click "Add Education"
    // Assert form visible
  });

  it('creates education on form submit', async () => {
    // Fill and submit form
    // Assert createEducation called
    // Assert success toast shown
  });

  it('handles create error', async () => {
    // Mock createEducation to throw
    // Submit form
    // Assert error toast shown
  });

  it('enters edit mode when edit button clicked', () => {
    // Click edit button
    // Assert form shown with pre-filled data
  });

  it('updates education on edit form submit', async () => {
    // Edit and submit
    // Assert updateEducation called
    // Assert success toast shown
  });

  it('deletes education when delete button clicked', async () => {
    // Click delete button
    // Assert deleteEducation called
    // Assert entry removed from list
  });
});
```

---

## 8. Implementation Notes

### Differences from Original Spec

The original spec (from the problem statement) proposed a more comprehensive data model with fields like:
- `school`, `degree`, `fieldOfStudy`, `location`, `startDate`, `endDate`, `isCurrent`, `description`

The actual implementation uses a simplified model:
- `institution`, `program`, `startYear`, `endYear`, `achievements`

**Rationale:**
- Theater/performing arts focus: Simpler model fits the domain better
- Less complex: Fewer fields = easier to use
- Year-only dates: Most users only remember years, not exact dates
- No "isCurrent" flag: Null `endYear` serves the same purpose

### Optimistic UI vs Server-first

The original spec called for optimistic UI updates with rollback on failure. The current implementation uses a **server-first** approach:

- **Create:** Entry added only after successful API response
- **Update:** Entry updated only after successful API response
- **Delete:** Entry removed immediately (optimistic) but no rollback on error

**Trade-offs:**
- ✅ **Pros:** Simpler logic, no complex rollback needed, data always in sync with server
- ❌ **Cons:** Slight delay before UI updates (requires network round-trip)

**Future improvement:** Could add optimistic updates with rollback for better perceived performance.

### Security Considerations

1. **Authentication:** All endpoints require valid JWT token
2. **Authorization:** User can only modify their own education entries (verified via profile ownership)
3. **Input validation:**
   - Required fields enforced
   - Year ranges validated (1900-2035)
   - Year order validated (start <= end)
4. **SQL injection protection:** Prisma ORM provides automatic escaping
5. **XSS protection:** Input is sanitized by React (automatic escaping)

---

## 9. Future Enhancements

### Potential Improvements

1. **Drag-and-drop reordering:** Allow users to reorder education entries
2. **Optimistic UI with rollback:** Faster perceived performance
3. **Bulk delete:** Delete multiple entries at once
4. **Import from LinkedIn:** Auto-populate education from LinkedIn profile
5. **Rich text editor:** Support formatted text in achievements field
6. **Certifications section:** Separate section for certifications/training
7. **GPA/Honors:** Optional fields for academic achievements
8. **Currently attending:** Explicit checkbox instead of null endYear
9. **Date picker:** Calendar UI for date selection instead of year-only
10. **Validation messages:** Inline error messages below form fields

### API Enhancements

1. **Bulk operations:** Create/update multiple entries in one request
2. **Pagination:** For users with many entries (probably not needed)
3. **Search/filter:** Filter by institution, program, year range
4. **Public API:** Allow viewing other users' education (with privacy settings)

---

## 10. Conclusion

The Education CRUD feature in Project Valine provides a complete, working solution for managing educational background in user profiles. It follows REST API best practices, provides a clean UI that mirrors the Experience section, and includes proper error handling and validation.

While there are opportunities for enhancement (optimistic UI, richer data model), the current implementation meets the core requirements and provides a solid foundation for future improvements.

**Status:** ✅ Fully implemented and deployed

**Last updated:** December 2024
