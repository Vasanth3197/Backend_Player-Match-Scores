const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Runnig at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
  }
};

initializeDBAndServer();

const convertPlayerDetailsDBObject = (player) => {
  return {
    playerId: player.player_id,
    playerName: player.player_name,
  };
};

const convertMatchDetailsDBObject = (match) => {
  return {
    matchId: match.match_id,
    match: match.match,
    year: match.year,
  };
};

const convertPlayerMatchScoreDBObject = (score) => {
  return {
    playerMatchId: score.player_match_id,
    playerId: score.player_id,
    matchId: score.match_id,
    score: score.score,
    fours: score.fours,
    sixes: score.sixes,
  };
};

// Returns a list of all the players in the player table
// GET API 1
app.get("/players/", async (request, response) => {
  const getPlayerDetailsQuery = `
            SELECT 
              * 
            FROM
              player_details;`;
  const playerDetails = await database.all(getPlayerDetailsQuery);
  response.send(
    playerDetails.map((eachPlayer) => convertPlayerDetailsDBObject(eachPlayer))
  );
});

// Returns a specific player based on the player ID
// GET API 2
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
            SELECT
               *
            FROM
               player_details
            WHERE
               player_id = ${playerId};`;
  const getPlayer = await database.get(getPlayerQuery);
  response.send(convertPlayerDetailsDBObject(getPlayer));
});

// Updates the details of a specific player based on the player ID
// PUT API 3
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
            UPDATE
               player_details
            SET 
               player_name = '${playerName}'
            WHERE 
               player_id = ${playerId};`;
  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

// Returns the match details of a specific match
// GET API 4
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const { match, year } = request.body;
  const getMatchDetailsQuery = `
            SELECT
               * 
            FROM 
               match_details
            WHERE 
               match_id = ${matchId};`;
  const getMatchDetails = await database.get(getMatchDetailsQuery);
  response.send(convertMatchDetailsDBObject(getMatchDetails));
});

// Returns a list of all the matches of a player
// GET API 5
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  //   const { matchId, match, year } = request.body;
  const getPlayerMatchQuery = `
            SELECT
              *
            FROM 
              player_match_score  
               NATURAL JOIN  match_details
            WHERE
               player_id = ${playerId};`;
  const playerMatch = await database.all(getPlayerMatchQuery);
  response.send(
    playerMatch.map((eachPlayer) => convertMatchDetailsDBObject(eachPlayer))
  );
});

// Returns a list of players of a specific match
// GET API 6
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  //   const { playerId, playerName } = request.body;
  const playerDetailsQuery = `
            SELECT 
               *
            FROM
               player_match_score  
               NATURAL JOIN player_details
            WHERE 
               match_id = ${matchId};`;
  const players = await database.all(playerDetailsQuery);
  response.send(
    players.map((eachMatch) => convertPlayerDetailsDBObject(eachMatch))
  );
});

// Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
// GET API 7
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerTotalScoreQuery = `
                SELECT 
                   player_details.player_id AS playerId,
                   player_details.player_name AS playerName,
                   SUM(score) AS totalScore,
                   SUM(fours) AS totalFours,
                   SUM(sixes) AS totalSixes 
                FROM
                   player_details 
                   INNER JOIN player_match_score
                   ON player_details.player_id = player_match_score.player_id
                WHERE 
                   player_details.player_id = ${playerId};`;
  const getPlayerScore = await database.get(getPlayerTotalScoreQuery);
  response.send(getPlayerScore);
});

module.exports = app;
