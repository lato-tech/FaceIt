import React from 'react';
import { Paper, Typography, Box, Autocomplete, TextField, CircularProgress } from '@mui/material';
import { getWeatherDescription } from '../../../utils/weatherDescription';


type Props = {
  inputValue: string;
  setInputValue: (val: string) => void;
  options: any[];
  handleInputChange: (event: any, value: string) => void;
  handleCitySelect: (event: any, newValue: any) => void;
  weather: any;
  selectedCity: any;
  loading: boolean;
};

const WeatherPanel: React.FC<Props> = ({
  inputValue,
  setInputValue,
  options,
  handleInputChange,
  handleCitySelect,
  weather,
  selectedCity,
  loading,
}) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        🌤️ Weather & Location
      </Typography>

      <Autocomplete
        freeSolo
        options={options}
        getOptionLabel={(option) => `${option.name}, ${option.country}`}
        onInputChange={handleInputChange}
        onChange={handleCitySelect}
        inputValue={inputValue}
        renderInput={(params) => <TextField {...params} label="Search city" fullWidth />}
        sx={{ mb: 2 }}
      />

      {loading ? (
        <CircularProgress />
      ) : weather ? (
        <Box>
          <Typography variant="subtitle1">
            {selectedCity.name}, {selectedCity.country}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Temp: {weather.temperature}°C, Wind: {weather.windspeed} km/h
          </Typography>
          <Typography variant="body2" fontWeight={600} fontSize="12px">
            Condition: <span style={{ fontWeight: 400 }}>{getWeatherDescription(weather.weathercode)}</span>
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Type a city name to view weather.
        </Typography>
      )}
    </Paper>
  );
};

export default WeatherPanel;
