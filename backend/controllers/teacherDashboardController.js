const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const ClassAssignment = require('../models/ClassAssignment');
const Department = require('../models/Department');

// Get teacher's dashboard overview
const getDashboardOverview = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const teacher = await Teacher.findById(teacherId)
            .populate('department')
            .populate('classAssignments');

        // Get class assignments
        const classAssignments = await ClassAssignment.find({ teacher: teacherId })
            .populate('students')
            .populate('department');

        // Get student statistics
        const totalStudents = classAssignments.reduce((acc, curr) => acc + curr.students.length, 0);
        
        // Get department statistics if HOD
        let departmentStats = null;
        if (teacher.role === 'hod') {
            const departmentTeachers = await Teacher.find({ department: teacher.department });
            const departmentStudents = await Student.find({ department: teacher.department });
            
            departmentStats = {
                totalTeachers: departmentTeachers.length,
                totalStudents: departmentStudents.length,
                teachers: departmentTeachers.map(t => ({
                    name: t.name,
                    position: t.position,
                    expertise: t.expertise
                }))
            };
        }

        res.json({
            teacher: {
                name: teacher.name,
                role: teacher.role,
                department: teacher.department,
                position: teacher.position
            },
            classAssignments: classAssignments.map(ca => ({
                year: ca.year,
                division: ca.division,
                batch: ca.batch,
                isClassTeacher: ca.isClassTeacher,
                totalStudents: ca.students.length,
                subjects: ca.subjects
            })),
            statistics: {
                totalStudents,
                totalClasses: classAssignments.length
            },
            departmentStats
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard overview' });
    }
};

// Get students under a specific class assignment
const getClassStudents = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await ClassAssignment.findById(assignmentId)
            .populate({
                path: 'students',
                select: 'name rollNumber email profilePicture skills projects certifications academicPerformance attendance'
            });

        if (!assignment) {
            return res.status(404).json({ message: 'Class assignment not found' });
        }

        // Check if teacher has access to this class
        if (assignment.teacher.toString() !== req.user._id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(assignment.students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching class students' });
    }
};

// Generate student progress report
const generateStudentReport = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId)
            .populate('department');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if teacher has access to this student
        const assignment = await ClassAssignment.findOne({
            teacher: req.user._id,
            students: studentId
        });

        if (!assignment) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Generate comprehensive report
        const report = {
            studentInfo: {
                name: student.name,
                rollNumber: student.rollNumber,
                department: student.department.name,
                year: student.year,
                division: student.division,
                batch: student.batch
            },
            academicPerformance: student.academicPerformance,
            skills: student.skills,
            certifications: student.certifications,
            projects: student.projects,
            achievements: student.achievements,
            internships: student.internships,
            attendance: student.attendance
        };

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error generating student report' });
    }
};

// Get department overview (for HOD)
const getDepartmentOverview = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user._id);
        
        if (teacher.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const department = await Department.findById(teacher.department)
            .populate('hod');

        const teachers = await Teacher.find({ department: teacher.department });
        const students = await Student.find({ department: teacher.department });

        // Get class-wise student distribution
        const classDistribution = await Student.aggregate([
            { $match: { department: teacher.department } },
            { $group: {
                _id: { year: '$year', division: '$division' },
                count: { $sum: 1 }
            }}
        ]);

        res.json({
            department: {
                name: department.name,
                code: department.code,
                hod: department.hod
            },
            statistics: {
                totalTeachers: teachers.length,
                totalStudents: students.length,
                classDistribution
            },
            teachers: teachers.map(t => ({
                name: t.name,
                position: t.position,
                expertise: t.expertise,
                qualifications: t.qualifications
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching department overview' });
    }
};

module.exports = {
    getDashboardOverview,
    getClassStudents,
    generateStudentReport,
    getDepartmentOverview
}; 