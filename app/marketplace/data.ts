export type MarketProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  seller: string;
  location: string;
  crop: string;
};

export const marketProducts: MarketProduct[] = [
  {id:"studio-headphones",name:"Studio უსადენო ყურსასმენები",category:"ტექნიკა",price:289,oldPrice:329,seller:"Sound House",location:"თბილისი",crop:"headphones"},
  {id:"minimal-lamp",name:"მინიმალისტური მაგიდის სანათი",category:"სახლი",price:149,seller:"Forma Living",location:"თბილისი",crop:"lamp"},
  {id:"city-handbag",name:"City ტყავის ჩანთა",category:"მოდა",price:235,oldPrice:269,seller:"Atelier 21",location:"ბათუმი",crop:"bag"},
  {id:"lilac-throw",name:"რბილი იასამნისფერი პლედი",category:"სახლი",price:89,seller:"Mellow Home",location:"ქუთაისი",crop:"throw"},
  {id:"ceramic-set",name:"ხელნაკეთი კერამიკის ნაკრები",category:"სახლი",price:74,seller:"Clay Room",location:"თბილისი",crop:"ceramic"},
  {id:"daily-vase",name:"Daily დეკორატიული ვაზა",category:"დეკორი",price:59,seller:"Forma Living",location:"რუსთავი",crop:"vase"},
];

export const categories = ["ყველაფერი","სახლი","ტექნიკა","მოდა","დეკორი"];
export const money = (value:number) => new Intl.NumberFormat("ka-GE",{maximumFractionDigits:0}).format(value)+" ₾";
