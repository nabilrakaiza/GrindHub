const express = require('express');
const router = express.Router();
const { signup, login, getAssignments, 
    getClass, getUser, getGroups, getMessages, 
    getDescription, updateUser, addMessage, 
    addGroups, joinGroup, setAssignment, 
    setClass, setModule, getModule, getAllLatestMessages, 
    getGroupMemberClassTime,  getAllUserModules, addSession, 
    getSessionSummary, getGroupStudySummaryToday} = require('../controllers/authController');

// , setAssignments,setClass,getClass,setModule,getModule,setChats,getChats,setGroups,getGroups,setUsers,getUsers
router.post('/signup', signup);
router.post('/login', login);
router.post('/getAssignments', getAssignments)
router.post('/setAssignment', setAssignment)
router.post('/setClass', setClass)
router.post('/getClass', getClass)
router.post('/setModule', setModule)
router.post('/getModule', getModule)
router.post('/getAllLatestMessages', getAllLatestMessages)
// router.post('/setChats', setChats)
// router.post('/getChats', getChats)
// router.post('/setGroups', setGroups)
router.post("/getMessages", getMessages)
router.post("/addMessage", addMessage)
router.post('/getGroups', getGroups)
router.post('/addGroups', addGroups)
router.post('/joinGroup', joinGroup)
// router.post('/setUsers', setUsers)
router.post('/updateUser', updateUser)
router.post('/getUser', getUser)
// router.post('/getUsersFromGroup', getUsersFromGroup)
router.post('/getDescription', getDescription)
router.post('/getGroupMemberClassTime', getGroupMemberClassTime)
router.post('/getAllUserModules', getAllUserModules)
router.post('/addSession', addSession)
router.post('/getSessionSummary', getSessionSummary)
router.post('/getSessionSummary', getGroupStudySummaryToday)




module.exports = router;
