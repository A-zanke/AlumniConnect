const express = require('express');
const router = express.Router();
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { getAnalytics, listUsers, setUserRole, deleteUser, exportUsersCsv, exportPostsCsv, exportEventsCsv, listDepartments, createDepartment, deleteDepartment } = require('../controllers/adminController');

router.use(protect, roleMiddleware('admin'));

router.get('/analytics', getAnalytics);
router.get('/users', listUsers);
router.put('/users/:id/role', setUserRole);
router.delete('/users/:id', deleteUser);

router.get('/export/users.csv', exportUsersCsv);
router.get('/export/posts.csv', exportPostsCsv);
router.get('/export/events.csv', exportEventsCsv);

// Branches (Departments)
router.get('/departments', listDepartments);
router.post('/departments', createDepartment);
router.delete('/departments/:id', deleteDepartment);

module.exports = router;

