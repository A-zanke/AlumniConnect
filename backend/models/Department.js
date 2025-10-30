const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    sparse: true // Allows multiple null values but unique non-null values
  }
}, { timestamps: true });

// Static method to find or create department
DepartmentSchema.statics.findOrCreate = async function(departmentName) {
  if (!departmentName || !departmentName.trim()) {
    return null;
  }
  
  const name = departmentName.trim();
  
  // Try to find by name or code
  let dept = await this.findOne({
    $or: [
      { name: name },
      { code: name }
    ]
  });
  
  // If not found, create it
  if (!dept) {
    dept = await this.create({
      name: name,
      code: name
    });
  }
  
  return dept;
};

module.exports = mongoose.model('Department', DepartmentSchema);
