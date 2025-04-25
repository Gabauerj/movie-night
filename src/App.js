import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Container,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Paper,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
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

  const fetchNominations = async () => {
    const snapshot = await getDocs(collection(db, "nominations"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setNominations(data);
  };

  const searchMovies = async (query) => {
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
      votes: 0,
      watched: false, // Add a watched field
    });

    setSearch("");
    setSelectedMovie(null);
    setSearchResults([]);
    fetchNominations();
  };

  const vote = async (id, currentVotes) => {
    const ref = doc(db, "nominations", id);
    await updateDoc(ref, { votes: currentVotes + 1 });
    fetchNominations();
  };

  const toggleWatched = async (id, currentWatched) => {
    const ref = doc(db, "nominations", id);
    await updateDoc(ref, { watched: !currentWatched });
    fetchNominations();
  };

  useEffect(() => {
    fetchNominations();
  }, []);

  return (
    <Container maxWidth="sm">
      <Box mt={4} mb={2}>
        <Typography variant="h4" gutterBottom>
          🎬 Movie Night Nominations
        </Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            label="Search Movie"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              searchMovies(e.target.value);
            }}
            fullWidth
            margin="normal"
          />
          {searchResults.length > 0 && (
            <TextField
              select
              label="Select a Movie"
              value={selectedMovie?.imdbID || ""}
              onChange={(e) =>
                setSelectedMovie(
                  searchResults.find((m) => m.imdbID === e.target.value)
                )
              }
              fullWidth
              margin="normal"
            >
              {searchResults.map((movie) => (
                <MenuItem key={movie.imdbID} value={movie.imdbID}>
                  {movie.Title} ({movie.Year})
                </MenuItem>
              ))}
            </TextField>
          )}
          <Button
            variant="contained"
            onClick={submitNomination}
            sx={{ mt: 1 }}
            fullWidth
          >
            Nominate
          </Button>
        </Paper>
        <Typography variant="h6" gutterBottom>
          Current Nominations
        </Typography>
        <List>
          {nominations.map((item) => (
            <ListItem key={item.id}>
              <ListItemText
                primary={`${item.movie} (${item.votes} votes)`}
                secondary={`IMDb: ${item.imdbID}`}
              />
              <IconButton edge="end" onClick={() => vote(item.id, item.votes)}>
                <ThumbUpIcon />
              </IconButton>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.watched}
                    onChange={() => toggleWatched(item.id, item.watched)}
                    name="watched"
                  />
                }
                label="Watched"
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  );
}
export default App;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
