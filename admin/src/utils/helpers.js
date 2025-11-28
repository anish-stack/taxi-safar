export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance); // returns integer km
};

export const calculateDuration = (distanceKm) => {
  const hours = distanceKm / 50;
  return parseFloat(hours.toFixed(2)); // returns hours
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (timeString) => {
  return timeString;
};

  export const decodePolyline = (encoded) => {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };




  

  export const getGoogleRoadDistance = async (lat1, lon1, lat2, lon2, apiKey) => {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lon1}&destinations=${lat2},${lon2}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (
    data.rows &&
    data.rows[0] &&
    data.rows[0].elements &&
    data.rows[0].elements[0].status === "OK"
  ) {
    return {
      distanceKm: data.rows[0].elements[0].distance.value / 1000,
      distanceText: data.rows[0].elements[0].distance.text,
      durationText: data.rows[0].elements[0].duration.text,
    };
  }

  return null;
};
