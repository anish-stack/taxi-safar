const express = require('express');
const { upload } = require('../middlewares/multer');
const {   createVehicleBrand,
  updateVehicleBrand,
  deleteVehicleBrand,
  getAllBrandsWithLogoAndName,
  getVehicleNamesByBrand, } = require('../controllers/admins/VehcilesBrands/VehcilesBrand.controller');
const CarRouter = express.Router();



CarRouter.post('/create-brand', upload.single('brandLogo'), createVehicleBrand);
CarRouter.put('/update-brand/:id', upload.single('brandLogo'), updateVehicleBrand);
CarRouter.delete('/delete-brand/:id', deleteVehicleBrand);
CarRouter.get('/get-all-brands', getAllBrandsWithLogoAndName);
CarRouter.get('/get-vehicles-by-brand/:id', getVehicleNamesByBrand);


module.exports = CarRouter;