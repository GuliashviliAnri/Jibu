"use client";
import {useMemo,useState} from "react";
import {Icon} from "../page";

const companies=[
 {id:"archi",initial:"A",name:"Archi Studio",category:"არქიტექტურა",location:"თბილისი",description:"არქიტექტურა, ინტერიერის დიზაინი და პროექტის სრული მართვა.",services:["ინტერიერი","არქიტექტურა"],tone:"navy"},
 {id:"nova",initial:"N",name:"Nova Digital",category:"ტექნოლოგიები",location:"თბილისი",description:"ვებპროდუქტები, ციფრული სისტემები და ბიზნესის ავტომატიზაცია.",services:["ვებგვერდი","ავტომატიზაცია"],tone:"violet"},
 {id:"green",initial:"G",name:"Green Office",category:"სივრცე და გარემო",location:"ბათუმი",description:"ოფისებისა და კომერციული სივრცეების გამწვანება და მოვლა.",services:["გამწვანება","მოვლა"],tone:"green"},
 {id:"frame",initial:"F",name:"Frame Production",category:"მედია",location:"თბილისი",description:"ბრენდებისთვის ფოტო, ვიდეო და სოციალური მედიის კონტენტი.",services:["ვიდეო","ფოტო"],tone:"orange"},
 {id:"legal",initial:"L",name:"Lex Partners",category:"კონსულტაცია",location:"ქუთაისი",description:"იურიდიული და საგადასახადო მხარდაჭერა მცირე ბიზნესებისთვის.",services:["იურიდიული","საგადასახადო"],tone:"blue"},
 {id:"move",initial:"M",name:"Move Logistics",category:"ლოგისტიკა",location:"თბილისი",description:"ქალაქთაშორისი გადაზიდვა და ბიზნეს მიწოდებების მართვა.",services:["მიწოდება","გადაზიდვა"],tone:"rose"},
];
const categories=["ყველა","ტექნოლოგიები","არქიტექტურა","მედია","კონსულტაცია","ლოგისტიკა","სივრცე და გარემო"];
const opportunities=[
 {type:"ვეძებ პარტნიორს",title:"კაფეების ქსელი ეძებს ინტერიერის დიზაინერს",meta:"თბილისი · გამოქვეყნდა დღეს"},
 {type:"მომსახურება მჭირდება",title:"ონლაინ მაღაზიისთვის საჭიროა საკურიერო პარტნიორი",meta:"საქართველო · 2 დღის წინ"},
 {type:"თანამშრომლობა",title:"კონტენტ სტუდია ეძებს სილამაზის ბრენდებს",meta:"თბილისი · 3 დღის წინ"},
];

export default function BusinessWorkspace(){
 const[query,setQuery]=useState("");const[category,setCategory]=useState("ყველა");
 const filtered=useMemo(()=>companies.filter(c=>(category==="ყველა"||c.category===category)&&`${c.name} ${c.category} ${c.services.join(" ")}`.toLowerCase().includes(query.toLowerCase())),[query,category]);
 return <main className="business-main">
  <section className="business-top">
   <div className="business-title"><span>JIBU BUSINESS</span><h1>იპოვე სწორი ბიზნესი<br/>და ახალი შესაძლებლობა.</h1><p>კომპანიები, სერვისები და საქმიანი თანამშრომლობა ერთ სივრცეში.</p></div>
   <div className="business-action-card"><span><Icon name="briefcase" size={23}/></span><div><small>შენი ბიზნესიც JIBU-ზე</small><h2>შექმენი ბიზნეს პროფილი</h2><p>აჩვენე მომსახურება და მიიღე ახალი მოთხოვნები.</p></div><button>ბიზნესის დამატება</button></div>
  </section>
  <section className="business-searchbar"><label><Icon name="search" size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="მოძებნე კომპანია, მომსახურება ან სფერო"/></label><button><Icon name="location" size={19}/> მთელი საქართველო</button></section>
  <div className="business-categories">{categories.map(item=><button className={category===item?"active":""} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div>
  <div className="business-layout">
   <section className="business-directory"><header><div><span>ბიზნეს კატალოგი</span><h2>აღმოაჩინე კომპანიები</h2></div><small>{filtered.length} შედეგი</small></header>
    {filtered.length?<div className="business-grid">{filtered.map(company=><article className="company-card" key={company.id}><div className="company-head"><span className={`company-logo ${company.tone}`}>{company.initial}</span><button aria-label="რჩეულებში დამატება"><Icon name="heart" size={18}/></button></div><small>{company.category}</small><h3>{company.name}</h3><p>{company.description}</p><div className="company-tags">{company.services.map(s=><span key={s}>{s}</span>)}</div><footer><span><Icon name="location" size={14}/>{company.location}</span><button>პროფილის ნახვა</button></footer></article>)}</div>:<div className="business-empty"><Icon name="search" size={26}/><h3>შედეგი ვერ მოიძებნა</h3><p>სცადე სხვა საძიებო სიტყვა ან სფერო.</p></div>}
   </section>
   <aside className="business-opportunities"><header><span>ბიზნეს მოთხოვნები</span><h2>შესაძლებლობები</h2><p>ნახე, ვის რა სჭირდება და შესთავაზე თანამშრომლობა.</p></header><div>{opportunities.map(item=><article key={item.title}><span>{item.type}</span><h3>{item.title}</h3><small>{item.meta}</small><button>დეტალურად <Icon name="arrow" size={15}/></button></article>)}</div><button className="all-opportunities">ყველა მოთხოვნის ნახვა</button></aside>
  </div>
 </main>
}
