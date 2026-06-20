/**
 * storage.js (투자봇 전용)
 * 간단한 JSON 파일 기반 사용자 저장소. "오늘의 나" 봇과 별도 DB 파일 사용
 * (같은 서버에서 두 봇을 함께 돌려도 users.json이 섞이지 않도록 분리).
 *
 * 저장 항목: { [chatId]: { birthYear, joinedAt } }
 * 투자봇은 ②(마찰/정체/확장) 산출에 출생연도만 필요 — bornbone_today.js 재사용.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'investUsers.json');

function loadUsers() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

function upsertUser(chatId, data) {
  const users = loadUsers();
  users[chatId] = { ...(users[chatId] || {}), ...data };
  saveUsers(users);
  return users[chatId];
}

function getUser(chatId) {
  const users = loadUsers();
  return users[chatId] || null;
}

function removeUser(chatId) {
  const users = loadUsers();
  delete users[chatId];
  saveUsers(users);
}

function getAllUsers() {
  return loadUsers();
}

module.exports = { loadUsers, saveUsers, upsertUser, getUser, removeUser, getAllUsers };
