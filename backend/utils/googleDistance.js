const axios = require("axios");

exports.getGoogleRouteData = async (lat1, lon1, lat2, lon2) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lon1}&destination=${lat2},${lon2}&key=${apiKey}`;

  const res = await axios.get(url);

  if (!res.data.routes || res.data.routes.length === 0) {
    throw new Error("No routes found from Google API");
  }

  const route = res.data.routes[0].legs[0];

  return {
    distanceKm: route.distance.value / 1000, // meters → km
    durationText: route.duration.text,
    polyline: res.data.routes[0].overview_polyline.points,
  };
};
