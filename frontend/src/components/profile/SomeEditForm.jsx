// ensure role-check is robust (case-insensitive) and never renders a <select> for alumni
const isAlumni = String(user?.role || '').toLowerCase() === 'alumni';

{ isAlumni ? (
  <div
    className="readonly-display"
    role="status"
    aria-readonly="true"
    tabIndex="-1"
    aria-label="department-readonly"
  >
    {department || 'Not specified'}
  </div>
) : (
  <select name="department" value={department} onChange={handleChange}>
    <option value="">Select</option>
    <option value="CSE">CSE</option>
    <option value="Electronics">Electronics</option>
    <option value="Mechanical">Mechanical</option>
    <option value="Civil">Civil</option>
    <option value="IT">IT</option>
    {/* ...other options... */}
  </select>
)}
