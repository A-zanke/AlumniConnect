const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const ClassAssignment = require('../models/ClassAssignment');

// Get student's dashboard overview
const getDashboardOverview = async (req, res) => {
    try {
        const studentId = req.user._id;
        const student = await Student.findById(studentId)
            .populate('department');

        // Get class teachers and subjects
        const classAssignment = await ClassAssignment.findOne({
            students: studentId
        }).populate('teacher', 'name position profilePicture');

        // Get academic performance summary
        const academicSummary = student.academicPerformance.reduce((acc, curr) => {
            acc.totalSGPA += curr.sgpa || 0;
            acc.totalSubjects += curr.subjects.length;
            return acc;
        }, { totalSGPA: 0, totalSubjects: 0 });

        const averageSGPA = academicSummary.totalSubjects > 0 
            ? academicSummary.totalSGPA / academicSummary.totalSubjects 
            : 0;

        // Get attendance summary
        const attendanceSummary = student.attendance.reduce((acc, curr) => {
            acc.totalPresent += curr.present;
            acc.totalClasses += curr.total;
            return acc;
        }, { totalPresent: 0, totalClasses: 0 });

        const attendancePercentage = attendanceSummary.totalClasses > 0
            ? (attendanceSummary.totalPresent / attendanceSummary.totalClasses) * 100
            : 0;

        res.json({
            student: {
                name: student.name,
                rollNumber: student.rollNumber,
                department: student.department.name,
                year: student.year,
                division: student.division,
                batch: student.batch
            },
            academic: {
                averageSGPA,
                totalSubjects: academicSummary.totalSubjects,
                latestSemester: student.academicPerformance[student.academicPerformance.length - 1]
            },
            attendance: {
                percentage: attendancePercentage,
                totalClasses: attendanceSummary.totalClasses,
                presentClasses: attendanceSummary.totalPresent
            },
            skills: student.skills,
            projects: student.projects.map(p => ({
                name: p.name,
                status: p.status,
                technologies: p.technologies
            })),
            certifications: student.certifications.map(c => ({
                name: c.name,
                issuer: c.issuer,
                date: c.date
            })),
            classInfo: classAssignment ? {
                classTeacher: classAssignment.teacher,
                subjects: classAssignment.subjects
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard overview' });
    }
};

// Update student profile
const updateProfile = async (req, res) => {
    try {
        const studentId = req.user._id;
        const {
            skills,
            projects,
            certifications,
            achievements,
            internships
        } = req.body;

        const updateData = {};
        if (skills) updateData.skills = skills;
        if (projects) updateData.projects = projects;
        if (certifications) updateData.certifications = certifications;
        if (achievements) updateData.achievements = achievements;
        if (internships) updateData.internships = internships;

        const student = await Student.findByIdAndUpdate(
            studentId,
            { $set: updateData },
            { new: true }
        );

        res.json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// Get academic performance details
const getAcademicPerformance = async (req, res) => {
    try {
        const studentId = req.user._id;
        const student = await Student.findById(studentId)
            .select('academicPerformance');

        res.json(student.academicPerformance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching academic performance' });
    }
};

// Get attendance details
const getAttendanceDetails = async (req, res) => {
    try {
        const studentId = req.user._id;
        const student = await Student.findById(studentId)
            .select('attendance')
            .populate('attendance.subject', 'name code');

        res.json(student.attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance details' });
    }
};

// Get class schedule and teachers
const getClassSchedule = async (req, res) => {
    try {
        const studentId = req.user._id;
        const classAssignment = await ClassAssignment.findOne({ students: studentId })
            .populate('teacher', 'name position profilePicture')
            .populate('department');

        if (!classAssignment) {
            return res.status(404).json({ message: 'Class assignment not found' });
        }

        res.json({
            classTeacher: classAssignment.teacher,
            subjects: classAssignment.subjects,
            department: classAssignment.department,
            year: classAssignment.year,
            division: classAssignment.division,
            batch: classAssignment.batch
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching class schedule' });
    }
};

module.exports = {
    getDashboardOverview,
    updateProfile,
    getAcademicPerformance,
    getAttendanceDetails,
    getClassSchedule
}; 