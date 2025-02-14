const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const mongoose = require('mongoose');
const Issue = require('../Issue');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  describe('Issue API', function() {
    let validId;

    // Before hook to create a test issue for testing
    before(function(done) {
      chai.request(server)
        .post('/api/issues/apitest') 
        .send({
          issue_title: 'Test Issue Title',
          issue_text: 'This is a test issue text',
          created_by: 'Tester',
          assigned_to: 'John Doe',
          status_text: 'In Progress',
          open: true
        })
        .end((err, res) => {
          if (err) return done(err);
          console.log('Created Issue Response:', res.body); // Debugging line
          validId = res.body._id;
          // Ensure that the issue is actually in the database
          chai.request(server)
            .get(`/api/issues/apitest`)
            .end((err, res) => {
              if (err) return done(err);
              assert.equal(res.body.length > 0, true); // Make sure there's at least one issue
              done();
            });
        });
    });

    // After hook to clean up the database by removing the test issue
    after(function(done) {
      Issue.deleteOne({ _id: validId }, (err) => {
        if (err) return done(err);
        done();
      });
    });
  });


    test('POST /api/issues/:project should create a new issue with all fields', async function () {
        const res = await chai
          .request(server)
          .post('/api/issues/apitest') 
          .send({
            issue_title: 'Test Issue Title',
            issue_text: 'This is a test issue text',
            created_by: 'Tester',
            assigned_to: 'John Doe',
            status_text: 'In Progress',
          });
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
        console.log(mongoose.connection.db.databaseName);
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

          test('GET /api/issues/:project with multiple filter should return filtered issues', function (done) {
            chai.request(server)
              .get('/api/issues/apitest?assigned_to=tester&created_by=Creator') 
              .end((err, res) => {
                assert.equal(res.status, 200);
                assert.isArray(res.body, 'Response should be an array');
          
                if (res.body.length > 0) {
                  res.body.forEach(issue => {
                    assert.equal(issue.assigned_to, 'tester', 'All returned issues should have assigned_to as tester');
                    assert.equal(issue.created_by, 'Creator', 'All returned issues should have created_by as Creator');
                  });
                } else {
                  console.log('No issues found with the given filter');
                }
                done();
              });
          });    
          
          test('PUT /api/issues/:project should update one field on an issue', function (done) {
            chai.request(server)
                .put('/api/issues/apitest')
                .send({
                    _id: validId, 
                    issue_text: "Updated issue text"
                })
                .end((err, res) => {
                  if (err) return done(err);

                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { result: 'successfully updated', _id: validId });
        
                    chai.request(server)
                        .get('/api/issues/apitest')
                        .query({ _id: validId })
                        .end((err, res) => {
                            assert.equal(res.status, 200);
                            assert.isArray(res.body);
                            done();
                        });
                });
        });

        test('PUT /api/issues/:project should update multiple fields on an issue', function (done) {
          chai.request(server)
              .put('/api/issues/apitest')
              .send({
                  _id: validId, 
                  issue_text: "Updated issue text",
                  issue_title: "Updated title",
                  status_text: "In Progress"
              })
              .end((err, res) => {
                if (err) return done(err);

                  assert.equal(res.status, 200);
                  assert.deepEqual(res.body, { result: 'successfully updated', _id: validId });
      
                  chai.request(server)
                      .get('/api/issues/apitest')
                      .query({ _id: validId })
                      .end((err, res) => {
                          assert.equal(res.status, 200);
                          assert.isArray(res.body);
                          done();
                      });
              });
      });
        
      test('PUT /api/issues/:project should return error when _id is missing', function (done) {
        chai.request(server)
            .put('/api/issues/apitest')
            .send({
                issue_text: "Updated issue text",
                issue_title: "Updated title",
                status_text: "In Progress"
            })
            .end((err, res) => {
                if (err) return done(err);    
                assert.deepEqual(res.body, { error: 'missing _id' });
    
                done();
            });
    });

    test('PUT /api/issues/:project should return error when no fields to update', function (done) {
      chai.request(server)
          .put('/api/issues/apitest')
          .send({
              _id: validId
          })
          .end((err, res) => {
              if (err) return done(err);
              assert.deepEqual(res.body, { error: 'no update field(s) sent', _id: validId });
  
              done();
          });
  });

        test('PUT /api/issues/:project should return error if _id is invalid', function (done) {
            chai.request(server)
                .put('/api/issues/apitest')
                .send({
                    _id: 'invalid_id',  
                    issue_text: "Updated text"
                })
                .end((err, res) => {                    
                    assert.deepEqual(res.body, { error: 'could not update', _id: 'invalid_id' });
                    done();
                });
        });

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
                    assert.deepEqual(res.body, { error: 'could not delete', _id: 'invalid_id' });
                    done();
                });
        });
    
        test('DELETE /api/issues/:project should return error if _id is missing', function (done) {
            chai.request(server)
                .delete('/api/issues/apitest')
                .send({}) 
                .end((err, res) => {
                    assert.deepEqual(res.body, { error: 'missing _id' });
                    done();
                });
        });
});             
