import React, { useEffect, useState } from "react";
import { useDebounce } from './hooks/useDebounce';
import ReactDOM from "react-dom/client";
import {
  Container,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OMDB_API_KEY = process.env.REACT_APP_OMDB_API_KEY;

function App() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [nominations, setNominations] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // State to track the active tab
  const [votesUsed, setVotesUsed] = useState(0);

  const debouncedSearch = useDebounce(search, 500);

  const fetchNominations = async () => {
    const snapshot = await getDocs(collection(db, "nominations"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setNominations(data);
  };

  const searchMovies = async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    const response = await fetch(
      `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(
        query
      )}&type=movie`
    );
    const data = await response.json();
    if (data.Search) {
      setSearchResults(data.Search);
    } else {
      setSearchResults([]);
    }
  };

  const submitNomination = async () => {
    if (!selectedMovie) return;

    await addDoc(collection(db, "nominations"), {
      movie: selectedMovie.Title,
      imdbID: selectedMovie.imdbID,
      poster: selectedMovie.Poster, // Save the poster URL
      votes: 0,
      watched: false,
    });

    setSearch("");
    setSelectedMovie(null);
    setSearchResults([]);
    fetchNominations();
  };

  const vote = async (id, newVotes) => {
    if (newVotes < 0) return; // Prevent negative votes

    if (newVotes > nominations.find((item) => item.id === id).votes && votesUsed >= 5) {
      alert("You have used all your votes for this session!");
      return;
    }

    const movieRef = doc(db, "nominations", id);
    await updateDoc(movieRef, { votes: newVotes });

    // Update session votes only when incrementing
    if (newVotes > nominations.find((item) => item.id === id).votes) {
      setVotesUsed(votesUsed + 1);
    }

    fetchNominations();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    fetchNominations();
  }, []);

  useEffect(() => {
    searchMovies(debouncedSearch);
  }, [debouncedSearch]);

  return (
    <Container maxWidth="sm">
      <Box mt={4} mb={2}>
        <Typography variant="h4" gutterBottom>
          🎬 Movie Night Nominations
        </Typography>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Search" />
          <Tab label="Nominations" />
        </Tabs>
        {activeTab === 0 && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <TextField
              label="Search Movie"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              margin="normal"
            />
            {searchResults.length > 0 && (
              <List>
                {searchResults.map((movie) => {
                  const isNominated = nominations.some(
                    (nomination) => nomination.imdbID === movie.imdbID
                  );

                  return (
                    <ListItem
                      key={movie.imdbID}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        mb: 1,
                        p: 1,
                      }}
                    >
                      {movie.Poster !== "N/A" && (
                        <img
                          src={movie.Poster}
                          alt={movie.Title}
                          style={{
                            width: "60px",
                            height: "90px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            marginRight: "16px",
                          }}
                        />
                      )}
                      <ListItemText
                        primary={movie.Title}
                        secondary={movie.Year}
                        sx={{ flex: 1, marginLeft: "16px" }}
                      />
                      {isNominated ? (
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{ marginRight: "16px" }}
                        >
                          Already Nominated
                        </Typography>
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            console.log("Selected Movie:", movie); // Debugging log
                            setSelectedMovie(movie);
                            submitNomination();
                          }}
                        >
                          Nominate
                        </Button>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            )}
            {selectedMovie && (
              <Button
                variant="contained"
                onClick={submitNomination}
                sx={{ mt: 2 }}
                fullWidth
              >
                Confirm Nomination
              </Button>
            )}
          </Paper>
        )}
        {activeTab === 1 && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" gutterBottom>
                Current Nominations
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {`Votes Used: ${votesUsed}/5`}
              </Typography>
            </Box>
            {nominations.length > 0 ? (
              <List>
                {nominations
                  .filter((item) => item.imdbID && item.imdbID.trim() !== "")
                  .sort((a, b) => b.votes - a.votes)
                  .map((item) => (
                    <ListItem
                      key={item.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        mb: 1,
                        p: 1,
                      }}
                    >
                      {item.poster && (
                        <img
                          src={item.poster}
                          alt={item.movie}
                          style={{
                            width: "60px",
                            height: "90px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            marginRight: "16px",
                          }}
                        />
                      )}
                      <ListItemText
                        primary={item.movie}
                        secondary={`${item.votes} votes`}
                        sx={{ flex: 1, marginLeft: "16px" }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => vote(item.id, item.votes - 1)}
                          disabled={item.votes <= 0} // Disable if votes are 0
                          sx={{ minWidth: "30px", padding: "0 8px" }}
                        >
                          -
                        </Button>
                        <Typography
                          variant="body1"
                          sx={{ mx: 2, minWidth: "30px", textAlign: "center" }}
                        >
                          {item.votes}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => vote(item.id, item.votes + 1)}
                          disabled={votesUsed >= 5} // Disable if user has used all votes
                          sx={{ minWidth: "30px", padding: "0 8px" }}
                        >
                          +
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No nominations yet.
              </Typography>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
}
export default App;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
