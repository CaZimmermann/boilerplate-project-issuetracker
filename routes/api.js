'use strict';
const mongoose = require('mongoose');
const Issue = require('../Issue');

module.exports = function (app) {

  app.route('/api/issues/:project')
  
    .get(async function (req, res){

      let project = req.params.project;
      let filters = { project: project, ...req.query };

      console.log('Filters:', filters);

      try {
        let issues = await Issue.find(filters).select('-__v');
       /*console.log('Fetched Issues:', issues);*/
        res.json(issues);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Server error" });
      }
    }
    })
    
    .post(async function (req, res){

      let { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;

      if (!issue_title || !issue_text || !created_by || issue_title.trim() === "" || issue_text.trim() === "" || created_by.trim() === "") {
        return res.json({ error: "required field(s) missing" });
      }

      try {
        const newIssue = new Issue({
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || "", 
        status_text: status_text || "",
        created_on: new Date(),
        updated_on: new Date(),
        open: true
      });

    const savedIssue = await newIssue.save();
    res.json({
      _id: savedIssue._id,
      issue_title: savedIssue.issue_title,
      issue_text: savedIssue.issue_text,
      created_by: savedIssue.created_by,
      assigned_to: savedIssue.assigned_to,
      status_text: savedIssue.status_text,
      created_on: savedIssue.created_on,
      updated_on: savedIssue.updated_on,
      open: savedIssue.open
    });

  } catch (error) {
    console.log("Error saving issue:", err);  // Debug log
    res.status(500).json({ error: 'Database error' });
  }
})
    
.put(async function (req, res) {
  let { _id, ...updates } = req.body;
  console.log('Received PUT request body:', req.body);

  // 1. Check if _id is missing
  if (!_id) {
    return res.json({ error: 'missing _id' });
  }

  // 2. Check if _id is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(String(_id))) {
    return res.json({ error: 'could not update', _id });
  }

  Object.keys(updates).forEach((key) => {
    if (updates[key] === "" || updates[key] === null || updates[key] === undefined) {
      delete updates[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.json({ error: 'no update field(s) sent', _id });
  }

  console.log('Fields to update:', updates);

  try {
    // Update the issue and ensure the 'updated_on' field is updated
    let updatedIssue = await Issue.findByIdAndUpdate(
      _id,
      { ...updates, updated_on: new Date() },
      { new: true }  // This returns the updated document
    );

    if (!updatedIssue) {
      return res.json({ error: 'could not update', _id });
    }

    // 8. Return a success response
    console.log('Updated Issue:', updatedIssue);
    res.json({ result: 'successfully updated', _id: updatedIssue._id });

  } catch (error) {
    // 9. Handle any errors in the update process
    console.error('Error updating issue:', error);
    res.json({ error: 'could not update', _id });
  }
})

    
    .delete(async function (req, res) {
      let { _id } = req.body;
  
      if (!_id) {
          return res.json({ error: 'missing _id' });
      }
  
      if (!mongoose.Types.ObjectId.isValid(String(_id))) {
          return res.json({ error: 'could not delete', _id });
      }
  
      try {
          let deletedIssue = await Issue.findByIdAndDelete(_id);
  
          if (!deletedIssue) {
              return res.json({ error: 'could not delete', _id });
          }
  
          res.json({ result: 'successfully deleted', _id });
      } catch (error) {
          return res.json({ error: 'could not delete', _id });
      }
  });
  

    app.get('/test-db', async (req, res) => {
      try {
        const result = await mongoose.connection.db.collection('your_collection').findOne({});
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: 'Database error' });
      }
    });
    
};
