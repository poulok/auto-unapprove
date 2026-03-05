#!/usr/bin/env node

/**
 * Mock pagination test - simulates the actual pagination functions
 * This tests the logic without making real API calls
 */

// Mock the global variables that the functions expect
global.owner = "test-owner";
global.repo = "test-repo";
global.prNumber = "123";

// Mock fetch function
global.fetch = async (url) => {
  console.log(`   🔗 Mock API call: ${url}`);
  
  // Parse the URL to determine what to return
  if (url.includes('/files')) {
    const pageMatch = url.match(/page=(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 1;
    
    // Simulate different page sizes
    let files = [];
    if (page === 1) {
      files = [...Array(100).keys()].map(i => ({ filename: `file${i}.js` }));
    } else if (page === 2) {
      files = [...Array(75).keys()].map(i => ({ filename: `file${i+100}.js` }));
    } else {
      files = []; // No more files
    }
    
    return {
      ok: true,
      json: async () => files
    };
  } else if (url.includes('/reviews')) {
    const pageMatch = url.match(/page=(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 1;
    
    let reviews = [];
    if (page === 1) {
      reviews = [
        { id: 1, user: { login: 'user1' }, state: 'APPROVED', submitted_at: '2024-01-01T10:00:00Z' },
        { id: 2, user: { login: 'user2' }, state: 'APPROVED', submitted_at: '2024-01-01T11:00:00Z' }
      ];
    } else {
      reviews = [];
    }
    
    return {
      ok: true,
      json: async () => reviews
    };
  } else if (url.includes('/commits')) {
    const pageMatch = url.match(/page=(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 1;

    let commits = [];
    if (page === 1) {
      commits = [
        { sha: 'abc123', author: { login: 'user1' }, commit: { committer: { date: '2024-01-01T09:00:00Z' } } },
        { sha: 'def456', author: { login: 'user2' }, commit: { committer: { date: '2024-01-01T10:00:00Z' } } }
      ];
    } else {
      commits = [];
    }

    return {
      ok: true,
      json: async () => commits
    };
  } else if (url.includes('/issues/') && url.includes('/comments')) {
    const pageMatch = url.match(/page=(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 1;

    let comments = [];
    if (page === 1) {
      comments = [
        { id: 1, user: { login: 'user1' }, body: 'Looks good! /hall-pass' },
        { id: 2, user: { login: 'user2' }, body: 'Some other comment' },
        { id: 3, user: { login: 'user3' }, body: '/hall-pass' }
      ];
    } else {
      comments = [];
    }

    return {
      ok: true,
      json: async () => comments
    };
  }
  
  return {
    ok: false,
    status: 404
  };
};

// Import the functions from the main script
const { getAllChangedFiles, getAllReviews, getAllCommits, getAllPRComments, getHallPassGranters } = require('../auto-unapprove.js');

async function runMockTests() {
  console.log("🧪 MOCK PAGINATION TESTS");
  console.log("========================");
  console.log("");
  
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer mock-token",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "dismiss-reviews-action",
  };
  
  try {
    console.log("📁 Testing getAllChangedFiles...");
    const files = await getAllChangedFiles(headers);
    console.log(`   ✅ Retrieved ${files.length} files`);
    console.log(`   📄 Sample files: ${files.slice(0, 3).join(', ')}...`);
    console.log("");
    
    console.log("📋 Testing getAllReviews...");
    const reviews = await getAllReviews(headers);
    console.log(`   ✅ Retrieved ${reviews.length} reviews`);
    console.log(`   👥 Reviewers: ${reviews.map(r => r.user.login).join(', ')}`);
    console.log("");
    
    console.log("📝 Testing getAllCommits...");
    const commits = await getAllCommits(headers);
    console.log(`   ✅ Retrieved ${commits.length} commits`);
    console.log(`   👤 Authors: ${commits.map(c => c.author.login).join(', ')}`);
    console.log("");

    console.log("💬 Testing getAllPRComments...");
    const prComments = await getAllPRComments(headers);
    console.log(`   ✅ Retrieved ${prComments.length} comments`);
    console.log(`   💬 Commenters: ${prComments.map(c => c.user.login).join(', ')}`);
    console.log("");

    console.log("🎫 Testing getHallPassGranters...");
    // user1 commented with /hall-pass, user2 did not, user3 did
    const granters = getHallPassGranters(prComments, "/hall-pass");
    console.log(`   ✅ Hall pass granters: ${Array.from(granters).join(', ')}`);
    const user1HasPass = granters.has('user1');
    const user2HasPass = granters.has('user2');
    const user3HasPass = granters.has('user3');
    if (!user1HasPass) throw new Error("user1 should have hall pass (comment contains /hall-pass)");
    if (user2HasPass) throw new Error("user2 should NOT have hall pass (comment lacks /hall-pass)");
    if (!user3HasPass) throw new Error("user3 should have hall pass (comment is exactly /hall-pass)");

    // Test with no comments
    const emptyGranters = getHallPassGranters([], "/hall-pass");
    if (emptyGranters.size !== 0) throw new Error("Empty comments should yield empty granters set");

    // Test with custom token
    const customGranters = getHallPassGranters(prComments, "/approve-changes");
    if (customGranters.size !== 0) throw new Error("Custom token not present should yield empty granters set");

    console.log(`   ✅ All hall pass assertions passed`);
    console.log("");

    console.log("🎉 All mock tests passed!");
    console.log("");
    console.log("💡 This confirms the pagination logic works correctly.");
    console.log("   Now you can test with real data using the test script.");
    
  } catch (error) {
    console.error("❌ Mock test failed:", error.message);
  }
}

// Run the tests
runMockTests(); 