const db = require('../db.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' , result:result});
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials', result:result });
    }

    const token = jwt.sign({ userid: user.userid, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.status(200).json({ success: true, message: 'Login success!', token:token});
  } catch (err) {
    console.error('Login error:', err);  
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.signup = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' , success : false});
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userid = crypto.randomUUID()

    const newUser = await db.query(
      'INSERT INTO users (userid, email, username, password) VALUES ($1, $2, $3, $4)',
      [userid, email, username, hashedPassword]
    );

    return res.status(201).json({ message: 'User created successfully', user: newUser.rows[0], success : true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong', success : false});
  }
};

exports.getAssignments = async(req, res) => {
  const {userid} = req.body

  try{
    const existingAssignment = await db.query('SELECT * FROM assignments WHERE userid = $1', [userid])
    if (existingAssignment.rows.length == 0){
      return res.status(404).json({message: "No assignment found!", success: false})
    }
    return res.status(200).json({message: "Assignments retrieved!", success:true, assignments:existingAssignment.rows})
  }

  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }

}

exports.setAssignment = async(req, res) => {
  const {userid, assignmentname, assignmentmodule, assignmentduedate, assignmenttimeduedate, timeneeded} = req.body

  try {
    const assignmentid = crypto.randomUUID()
    const assignmentpercentage = 0
    const queryText = "INSERT INTO assignments (assignmentid, assignmentname, assignmentmodule, assignmentpercentage, assignmentduedate, assignmenttimeduedate, timeneeded, userid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *"
    const { rows } = await db.query(queryText, [assignmentid, assignmentname, assignmentmodule, assignmentpercentage, assignmentduedate, assignmenttimeduedate, timeneeded, userid]);

    if (rows.length == 0){
      return res.status(500).json({ message: 'Something went wrong', success : false});
    }

    return res.status(201).json({
      message: "Assignment added successfully!", 
      success: true, 
      assignment: rows[0] 
    });
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.getClass = async(req, res) => {
  const {userid} = req.body

  try{
    const existingClass = await db.query('SELECT * FROM class WHERE userid = $1', [userid])
    if (existingClass.rows.length == 0){
      return res.status(404).json({message: "No class found!", success: false})
    }
    return res.status(200).json({message: "Class retrieved!", success:true, classes:existingClass.rows})
  }

  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }

}

exports.setClass = async(req, res) => {
  const {userid, classtype, modulename, classlocation, startdate, starttime, enddate, endtime} = req.body

  try {
    const classid = crypto.randomUUID()
    const queryText = "INSERT INTO class (classid, userid, modulename, classtype, classlocation, startdate, starttime, enddate, endtime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *"
    const { rows } = await db.query(queryText, [classid, userid, modulename, classtype, classlocation, startdate, starttime, enddate, endtime]);

    if (rows.length == 0){
      return res.status(500).json({ message: 'Something went wrong', success : false});
    }

    return res.status(201).json({
      message: "Class added successfully!", 
      success: true, 
      newclass: rows[0] 
    });
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.setModule = async(req, res) => {
  const {modulename, moduletitle, credits, instructor, userid} = req.body

  try {
    const moduleid = crypto.randomUUID()
    const queryText = "INSERT INTO modules (moduleid, modulename, moduletitle, credits, instructor, userid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"
    const { rows } = await db.query(queryText, [moduleid, modulename, moduletitle, credits, instructor, userid]);

    if (rows.length == 0){
      return res.status(500).json({ message: 'Something went wrong', success : false});
    }

    return res.status(201).json({
      message: "Module added successfully!", 
      success: true, 
      module: rows[0] 
    });

  }catch (error){
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.getModule = async(req, res) => {
  const {userid} = req.body

  try {
    const queryText = "SELECT * FROM modules WHERE userid = $1"
    const existingModules = await db.query(queryText, [userid]);

    if (existingModules.rows.length == 0){
      return res.status(500).json({ message: 'Something went wrong', success : false});
    }

    return res.status(201).json({
      message: "Module added successfully!", 
      success: true, 
      modules: existingModules.rows
    });

  }catch (error){
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.getUser = async(req, res) => {
  const {userid} = req.body

  try{
    const existingUser = await db.query('SELECT * FROM users WHERE userid = $1', [userid])
    if (existingUser.rows.length == 0){
      return res.status(404).json({message: "No user found!", success: false})
    }
    return res.status(200).json({message: "User retrieved!", success:true, existingUser:existingUser.rows})
  }

  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.updateUser = async(req, res) => {
  const { userid, field, value } = req.body;
  const columnMap = {
    notifications: 'notification',
    taskDeadline: 'tasknotification',
    lectureClass: 'classnotification',
    groupMessages: 'groupnotification',
    privateMessages: 'privatenotification',
  };

  const dbColumn = columnMap[field];

  // If the provided field is not in our map, reject the request.
  if (!dbColumn) {
    return res.status(400).json({ success: false, message: 'Invalid notification field.' });
  }

  try {
    // We can now safely build the query. The column name is from our secure whitelist,
    // and the values are passed as parameters to prevent SQL injection.
    const query = `UPDATE users SET ${dbColumn} = $1 WHERE userid = $2 RETURNING *`;
    
    const { rows } = await db.query(query, [value, userid]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, message: 'Notification setting updated.', user: rows[0] });

  } catch (error) {
    console.error('Error updating notification setting:', error);
    return res.status(500).json({ message: 'Something went wrong', success: false });
  }
}

// exports.getUsersFromGroup = async(req, res) => {
//   const {groupid} = req.body

//   try { 
//     const existingUsers = await db.query("Select u.userid, u.username from groupmembers g join users u on u.userid = g.userid where groupid = $1", [groupid])
//     if (existingUsers.rows.length == 0){
//       return res.status(404).json({message: "No user found!", success: false})
//     } 
//     return res.status(200).json({message: "Users retrieved!", success:true, users:existingUsers.rows})
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Something went wrong', success : false});
//   }
// }

exports.getGroups = async(req, res) => {
  const {userid} = req.body

  try{
    const existingGroups = await db.query('SELECT gc.groupid, gc.groupname FROM groupmembers gm JOIN groupcollections gc ON gm.groupid = gc.groupid WHERE gm.userid = $1', [userid])
    if (existingGroups.rows.length == 0){
      return res.status(404).json({message: "No groups found!", success: false})
    }
    return res.status(200).json({message: "Group retrieved!", success:true, groups:existingGroups.rows})
  }

  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.addGroups = async(req, res) => {
  const {groupname, groupdescription} = req.body

  try {
    const groupid = crypto.randomUUID()
    const invitationcode = generateRandomString(6)
    const queryText = "INSERT INTO groupcollections (groupid, groupname, groupdescription, invitationcode) VALUES ($1, $2, $3, $4) RETURNING *"

    const { rows } = await db.query(queryText, [groupid, groupname, groupdescription, invitationcode]);

    if (rows.length == 0){
      return res.status(500).json({ message: 'Something went wrong', success : false});
    }

    return res.status(201).json({
      message: "Group added successfully!", 
      success: true, 
      group: rows[0] 
    });
  }
  catch (error){
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.joinGroup = async(req, res) => {
  const {invitationcode, userid} = req.body

  try {
    const getGroupidQuery = "SELECT * from groupcollections where invitationcode = $1"
    const {rows: groupRows} = await db.query(getGroupidQuery, [invitationcode])

    if (groupRows.length == 0){
      return res.status(404).json({ message: 'Invitation code doesnt belon to any group', success : false});
    } 

    const memberid = crypto.randomUUID()
    const queryText = "INSERT INTO groupmembers (memberid, userid, groupid) VALUES ($1, $2, $3) RETURNING *"
    const {rows} = await db.query(queryText, [memberid, userid, groupRows[0].groupid])

    if (rows.length == 0){
      return res.status(500).json({ message: 'Something went wrong', success : false});
    }

    return res.status(201).json({
      message: "Person added successfully!", 
      success: true, 
      newGroup: rows[0] 
    });
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}


exports.getMessages = async(req, res) => {
  const {groupid} = req.body

  try{
    const queryText = "SELECT m.messageid, m.messagecontent, m.datesent, m.timesent, u.userid, u.username FROM messagecollections m JOIN users u ON m.userid = u.userid WHERE m.groupid = $1 ORDER BY m.datesent ASC, m.timesent ASC;"
    const existingMessages = await db.query(queryText, [groupid])
    if (existingMessages.rows.length == 0){
      return res.status(404).json({message: "No messages found!", success: false, messages:existingMessages, gi:groupid})
    }
    return res.status(200).json({message: "Messages retrieved!", success:true, messages:existingMessages.rows})
  }

  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}

exports.addMessage = async(req, res) => {
  // 1. Destructure the required information from the request body.
  const { groupid, userid, messagecontent} = req.body;

  // Basic validation to ensure all required fields are present.
  if (!groupid || !userid || !messagecontent) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: groupid, userid, and messagecontent are all required.' 
    });
  }

  try {
    // 2. Define the SQL INSERT statement.
    // The `timestamp` column is added, and we use `NOW()` to let PostgreSQL
    // insert the current transaction's timestamp. This is more reliable than
    // using a value from the client.
    const date = new Date()
    const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()
    const messageid = crypto.randomUUID()
    console.log(seconds)
    const queryText = "INSERT INTO messagecollections (messageid, groupid, userid, messagecontent, datesent, timesent) VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING *";
    
    // 3. Execute the query. The parameters still match the placeholders $1, $2, and $3.
    const { rows } = await db.query(queryText, [messageid, groupid, userid, messagecontent, seconds]);

    // 4. Return a success response.
    // The returned `newMessage` object will now include the timestamp generated by the database.
    return res.status(201).json({
      message: "Message added successfully!", 
      success: true, 
      newMessage: rows[0] 
    });
  }
  catch (error) {
    // 5. Handle any potential database errors.
    console.error("Error adding message:", error);
    return res.status(500).json({ message: 'Something went wrong', success: false });
  }
};

exports.getDescription = async (req, res) => {
  const {groupid} = req.body

  try{
    const queryText = "SELECT u.username, u.userid, gc.groupdescription, gc.groupname, gc.invitationcode FROM groupcollections gc JOIN groupmembers gm ON gm.groupid = gc.groupid JOIN users u ON gm.userid = u.userid WHERE gm.groupid = $1"
    const existingDescription = await db.query(queryText, [groupid])
    if (existingDescription.rows.length == 0){
      return res.status(404).json({message: "No description found!", success: false, description:existingDescription})
    }
    return res.status(200).json({message: "Description retrieved!", success:true, description:existingDescription.rows})
  }

  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', success : false});
  }
}


// exports.setAssignments

// exports.setClass

// exports.setModule
// exports.getModule

// exports.setChats
// exports.getChats

// exports.setGroups
// exports.getGroups

// exports.setUsers


// Helper Functions

function generateRandomString(length) {
  // Define the set of characters to choose from
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  // Loop 'length' times to build the string
  for (let i = 0; i < length; i++) {
    // Pick a random character from the 'characters' string
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }

  return result;
}