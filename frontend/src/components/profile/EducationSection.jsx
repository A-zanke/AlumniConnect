import React from 'react';
import './EducationSection.css';

const EducationSection = ({ department, graduationYear }) => {
  return (
    <div className="education-section">
      <h3>Education</h3>
      <div className="education-fields">
        <div className="field-group">
          <label>Department</label>
          <div className="readonly-field" aria-readonly="true">
            {department || 'Not specified'}
          </div>
        </div>
        <div className="field-group">
          <label>Graduation Year</label>
          <div className="readonly-field" aria-readonly="true">
            {graduationYear || 'Not specified'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationSection;