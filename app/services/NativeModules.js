import { NativeModules } from 'react-native';




const { FloatingWidget, RideModule } = NativeModules;

console.log("FloatingWidget",FloatingWidget)
console.log("RideModule",RideModule)

export const FloatingWidgetService = FloatingWidget;
export const RidePoolingModule = RideModule;