import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home/Home';
import Drivers from './pages/Drivers/Drivers';
import Overview from './pages/Dashboard/Overview';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DriverView from './pages/Drivers/View';
import PostRides from './pages/rides/Post/PostRides';
import PostRidesView from './pages/rides/Post/PostRidesView';
import Settings from './pages/Dashboard/Settings';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<Overview />} />

          <Route path="/drivers/all" element={<Drivers />} />
          <Route path="/driver/view/:id" element={<DriverView />} />
          
          <Route path="/bookings/post-rides" element={<PostRides/>} />
          <Route path="/post-rides/view/:id" element={<PostRidesView/>} />

          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Route>
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;