const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const mongoose = require('mongoose');
const Issue = require('../Issue');

chai.use(chaiHttp);

suite('Functional Tests', function() {
    let createdIssueId

    test('POST /api/issues/:project should create a new issue with all fields', async function () {
        const res = await chai
          .request(server)
          .post('/api/issues/apitest') // Adjust project name as needed
          .send({
            issue_title: 'Test Issue Title',
            issue_text: 'This is a test issue text',
            created_by: 'Tester',
            assigned_to: 'John Doe',
            status_text: 'In Progress',
          });
    
        // Check if the status is 200
        assert.equal(res.status, 200);
    
        // Ensure all required fields are returned in the response
        assert.hasAllKeys(res.body, [
          'issue_title',
          'issue_text',
          'created_by',
          'assigned_to',
          'status_text',
          'created_on',
          'updated_on',
          'open',
          '_id',
        ]);
    
        // Ensure returned values match the sent data
        assert.equal(res.body.issue_title, 'Test Issue Title');
        assert.equal(res.body.issue_text, 'This is a test issue text');
        assert.equal(res.body.created_by, 'Tester');
        assert.equal(res.body.assigned_to, 'John Doe');
        assert.equal(res.body.status_text, 'In Progress');
    
        // Validate that the created_on and updated_on fields are date strings
        assert.isString(res.body.created_on);
        assert.isString(res.body.updated_on);
    
        // Validate that open is set to true by default
        assert.isTrue(res.body.open);
    
        // Save the issue ID for cleanup after tests
        createdIssueId = res.body._id;
      });
      test('POST /api/issues/:project should return error if required fields are missing', async function () {
        const res = await chai
          .request(server)
          .post('/api/issues/apitest')
          .send({
            issue_title: 'Test Issue Title',
            issue_text: 'This is a test issue text',
            // Missing required field: created_by
          });
    
        // Check if the status is 400 and error message is returned
        assert.equal(res.status, 400);
        assert.deepEqual(res.body, { error: 'required field(s) missing' });
      });
    
      test('POST /api/issues/:project should create an issue with empty optional fields', async function () {
        const res = await chai
          .request(server)
          .post('/api/issues/apitest')
          .send({
            issue_title: 'Test Issue Title',
            issue_text: 'This is a test issue text',
            created_by: 'Tester',
            // Optional fields are omitted
          });
    
        // Check if all required fields are included in the response and optional fields are empty
        assert.equal(res.status, 200);
        assert.hasAllKeys(res.body, [
          'issue_title',
          'issue_text',
          'created_by',
          'assigned_to',
          'status_text',
          'created_on',
          'updated_on',
          'open',
          '_id',
        ]);
    
        assert.equal(res.body.assigned_to, ''); // Ensure that the optional field is empty
        assert.equal(res.body.status_text, ''); // Ensure that the optional field is empty
      });

      test('GET /api/issues/:project should return all issues for the project', function (done) {
        chai.request(server)
          .get('/api/issues/apitest')
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.isArray(res.body, 'Response should be an array');
      
            if (res.body.length > 0) {
              const issue = res.body[0];
              assert.containsAllKeys(issue, [
                '_id', 'issue_title', 'issue_text', 'created_by', 
                'assigned_to', 'status_text', 'created_on', 
                'updated_on', 'open'
              ]);
            }
            done();
          });
        });

        test('GET /api/issues/:project with one filter should return filtered issues', function (done) {
            chai.request(server)
              .get('/api/issues/apitest?assigned_to=tester') 
              .end((err, res) => {
                assert.equal(res.status, 200);
                assert.isArray(res.body, 'Response should be an array');
          
                if (res.body.length > 0) {
                  res.body.forEach(issue => {
                    assert.equal(issue.assigned_to, 'tester', 'All returned issues should have assigned_to as tester');
                  });
                }
                done();
              });
          });

          test('GET /api/issues/:project with one filter should return filtered issues', function (done) {
            chai.request(server)
              .get('/api/issues/apitest?assigned_to=tester&status_text=copium') 
              .end((err, res) => {
                assert.equal(res.status, 200);
                assert.isArray(res.body, 'Response should be an array');
          
                if (res.body.length > 0) {
                  res.body.forEach(issue => {
                    assert.equal(issue.assigned_to, 'tester', 'All returned issues should have assigned_to as tester');
                    assert.equal(issue.status_text, 'copium', 'All returned issues should have status_text as copium');
                  });
                }
                done();
              });
          });

          test('PUT /api/issues/:project should update a single field', function (done) {
            chai.request(server)
              .get('/api/issues/apitest')
              .end((err, res) => {
                if (err) return done(err);
    
                let validId = res.body[0]?._id;
                if (!validId) return done(new Error("No valid _id found for testing"));
                chai.request(server)
                .put('/api/issues/apitest')
                .send({ _id: validId, issue_text: "Updated text" })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { result: 'successfully updated', _id: validId });
                    done();
                });
                });
            });
            test('PUT /api/issues/:project should update multiple fields', function (done) {
                chai.request(server)
                    .get('/api/issues/apitest') 
                    .end((err, res) => {
                        if (err) return done(err);
            
                        let validId = res.body[0]?._id; 
                        if (!validId) return done(new Error("No valid _id found for testing"));
            
                        chai.request(server)
                            .put('/api/issues/apitest')
                            .send({
                                _id: validId, 
                                issue_title: "Updated Title", 
                                status_text: "Updated Status"
                            })
                            .end((err, res) => {
                                assert.equal(res.status, 200); 
                                assert.deepEqual(res.body, { result: 'successfully updated', _id: validId });
            
                                chai.request(server)
                                    .get('/api/issues/apitest')
                                    .end((err, res) => {
                                        if (err) return done(err);
                                        let updatedIssue = res.body.find(issue => issue._id === validId);
                                        assert.equal(updatedIssue.issue_title, "Updated Title"); 
                                        assert.equal(updatedIssue.status_text, "Updated Status"); 
                                        done();
                                    });
                            });
                    });
            });
            
            test('PUT /api/issues/:project should return error if _id is missing', function (done) {
                chai.request(server)
                    .put('/api/issues/apitest')
                    .send({
                        issue_title: "Updated Title", 
                        status_text: "Updated Status"
                    })
                    .end((err, res) => {
                        assert.equal(res.status, 400);
                        assert.deepEqual(res.body, { error: 'missing _id' });
                        done();
                    });
            });
            test('PUT /api/issues/:project should return error if no fields to update', function (done) {
                chai.request(server)
                    .get('/api/issues/apitest') 
                    .end((err, res) => {
                        if (err) return done(err);
            
                        let validId = res.body[0]?._id; 
                        if (!validId) return done(new Error("No valid _id found for testing"));
                chai.request(server)
                    .put('/api/issues/apitest')
                    .send({
                        _id: validId, 
                    })
                    .end((err, res) => {
                        assert.equal(res.status, 400);
                        assert.deepEqual(res.body, { error: 'no update field(s) sent' , _id: validId});
                        done();
                    });
            });
        });    

        test('PUT /api/issues/:project should return error if _id is invalid', function (done) {
            // Send a PUT request with an invalid _id
            chai.request(server)
                .put('/api/issues/apitest')
                .send({
                    _id: 'invalid_id',  // Invalid _id
                    issue_text: "Updated text"
                })
                .end((err, res) => {
                    // Check if the status is 400
                    assert.equal(res.status, 400);
                    
                    // Ensure the error message is returned with the invalid _id
                    assert.deepEqual(res.body, { error: 'could not update', _id: 'invalid_id' });
                    done();
                });
        });
        let validId; 

        before(function (done) {
            chai.request(server)
                .post('/api/issues/apitest')
                .send({
                    issue_title: "Delete Test",
                    issue_text: "This issue will be deleted",
                    created_by: "Tester"
                })
                .end((err, res) => {
                    if (err) return done(err);
                    validId = res.body._id;
                    if (!validId) return done(new Error("No valid _id found for testing"));
                    done();
                });
        });
    
        test('DELETE /api/issues/:project should delete an issue', function (done) {
            chai.request(server)
                .delete('/api/issues/apitest')
                .send({ _id: validId }) 
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { result: 'successfully deleted', _id: validId });
                    done();
                });
        });
    
        test('DELETE /api/issues/:project should return error if _id is invalid', function (done) {
            chai.request(server)
                .delete('/api/issues/apitest')
                .send({ _id: 'invalid_id' }) 
                .end((err, res) => {
                    assert.equal(res.status, 400);
                    assert.deepEqual(res.body, { error: 'could not delete', _id: 'invalid_id' });
                    done();
                });
        });
    
        test('DELETE /api/issues/:project should return error if _id is missing', function (done) {
            chai.request(server)
                .delete('/api/issues/apitest')
                .send({}) 
                .end((err, res) => {
                    assert.equal(res.status, 400);
                    assert.deepEqual(res.body, { error: 'missing _id' });
                    done();
                });
        });
});             
