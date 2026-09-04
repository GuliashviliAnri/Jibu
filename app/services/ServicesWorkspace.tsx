"use client";
import {useMemo,useState} from "react";
import {Icon} from "../page";

const categories=[
 {name:"ყველა",mark:"✦"},{name:"რემონტი",mark:"⌂"},{name:"დასუფთავება",mark:"◇"},{name:"ტექნიკა",mark:"⚙"},{name:"სილამაზე",mark:"○"},{name:"ავტო",mark:"◈"},{name:"განათლება",mark:"A"},{name:"მიწოდება",mark:"↗"},
];
const providers=[
 {name:"FixPro",initial:"F",service:"რემონტი",title:"სახლის მცირე სარემონტო სამუშაოები",rating:"4.9",reviews:128,price:"40 ₾-დან",location:"თბილისი",verified:true,tone:"navy"},
 {name:"Cleanly",initial:"C",service:"დასუფთავება",title:"ბინისა და ოფისის პროფესიონალური დასუფთავება",rating:"4.8",reviews:94,price:"60 ₾-დან",location:"თბილისი · ბათუმი",verified:true,tone:"teal"},
 {name:"Tech Doctor",initial:"T",service:"ტექნიკა",title:"კომპიუტერისა და მობილურის დიაგნოსტიკა",rating:"4.9",reviews:176,price:"30 ₾-დან",location:"მთელი საქართველო",verified:true,tone:"violet"},
 {name:"Beauty Room",initial:"B",service:"სილამაზე",title:"მაკიაჟი და ვარცხნილობა ადგილზე მომსახურებით",rating:"4.7",reviews:81,price:"50 ₾-დან",location:"თბილისი",verified:false,tone:"rose"},
 {name:"AutoCare",initial:"A",service:"ავტო",title:"ავტომობილის დეტეილინგი და ქიმწმენდა",rating:"4.8",reviews:67,price:"90 ₾-დან",location:"თბილისი · რუსთავი",verified:true,tone:"orange"},
 {name:"Lingua",initial:"L",service:"განათლება",title:"ინგლისური ენის ინდივიდუალური გაკვეთილები",rating:"5.0",reviews:52,price:"25 ₾-დან",location:"ონლაინ",verified:true,tone:"blue"},
];

export default function ServicesWorkspace(){
 const[active,setActive]=useState("ყველა");const[query,setQuery]=useState("");
 const shown=useMemo(()=>providers.filter(p=>(active==="ყველა"||p.service===active)&&`${p.name} ${p.service} ${p.title}`.toLowerCase().includes(query.toLowerCase())),[active,query]);
 return <main className="services-main">
  <section className="services-hero"><div><span>JIBU SERVICES</span><h1>იპოვე სანდო პროფესიონალი.</h1><p>აირჩიე მომსახურება, შეადარე სპეციალისტები და გააგზავნე მოთხოვნა ერთ სივრცეში.</p><label><Icon name="search" size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="რა მომსახურება გჭირდება?"/><button>მოძებნა</button></label></div><aside><span><Icon name="tools" size={24}/></span><small>ვერ იპოვე სასურველი?</small><h2>აღწერე რა გჭირდება</h2><p>შექმენი ერთი მოთხოვნა და შესაბამისი სპეციალისტები თავად დაგიკავშირდებიან.</p><button>მოთხოვნის დამატება</button></aside></section>
  <section className="service-category-section"><header><div><span>კატეგორიები</span><h2>აირჩიე მომსახურება</h2></div><small>ყველა სერვისი ერთ სივრცეში</small></header><div>{categories.map(c=><button className={active===c.name?"active":""} onClick={()=>setActive(c.name)} key={c.name}><span>{c.mark}</span><b>{c.name}</b></button>)}</div></section>
  <div className="services-layout"><section className="provider-section"><header><div><span>რეკომენდებული</span><h2>სანდო სპეციალისტები</h2></div><small>{shown.length} შედეგი</small></header>{shown.length?<div className="provider-grid">{shown.map(provider=><article className="provider-card" key={provider.name}><header><span className={`provider-logo ${provider.tone}`}>{provider.initial}</span><div><strong>{provider.name}{provider.verified&&<i>✓</i>}</strong><small>{provider.service}</small></div><button aria-label="რჩეულებში დამატება"><Icon name="heart" size={18}/></button></header><h3>{provider.title}</h3><div className="provider-rating"><b>★ {provider.rating}</b><span>{provider.reviews} შეფასება</span></div><footer><div><small><Icon name="location" size={13}/>{provider.location}</small><strong>{provider.price}</strong></div><button>პროფილის ნახვა</button></footer></article>)}</div>:<div className="services-empty"><Icon name="search" size={26}/><h3>სპეციალისტი ვერ მოიძებნა</h3><p>შეცვალე საძიებო სიტყვა ან აირჩიე სხვა კატეგორია.</p></div>}</section>
   <aside className="service-request-side"><span>როგორ მუშაობს</span><h2>მომსახურების მიღება მარტივია</h2><ol><li><b>1</b><div><strong>აღწერე საჭიროება</strong><small>მიუთითე სამუშაო, ადგილი და სასურველი დრო.</small></div></li><li><b>2</b><div><strong>მიიღე შეთავაზებები</strong><small>შეადარე ფასი, გამოცდილება და შეფასებები.</small></div></li><li><b>3</b><div><strong>აირჩიე პროფესიონალი</strong><small>დაუკავშირდი და შეთანხმდი დეტალებზე.</small></div></li></ol><button>შექმენი მოთხოვნა</button></aside>
  </div>
 </main>
}
