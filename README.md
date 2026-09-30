# RaidSight

RaidSight is a World of Warcraft gameplay coach. Players upload a raid or dungeon recording and receive timestamped, actionable feedback about mechanics, positioning, uptime, cooldowns, and survivability.

## Current slice

This repository contains the first end-to-end prototype:

- responsive review workspace
- drag-and-drop video selection
- optional Warcraft Logs URL field
- sample coaching report timeline
- privacy and processing-state UI
- local multipart upload API
- asynchronous review job lifecycle

The current analyzer returns a sample report after the upload job completes. The next slice should replace that analyzer with Warcraft Logs correlation and video frame extraction.

## Run locally

Run `npm start`, then open `http://localhost:3000`. Uploads are stored in the local `uploads/` directory, which is ignored from source control.
