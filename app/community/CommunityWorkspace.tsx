"use client";
import {useMemo,useState} from "react";
import {Icon} from "../page";

const topics=["ყველა","ჩემი უბანი","რეკომენდაციები","კითხვა","ცხოვრების სტილი","დახმარება"];
const posts=[
 {id:1,author:"ნინო მ.",initial:"ნ",time:"12 წუთის წინ",topic:"რეკომენდაციები",location:"თბილისი · ვაკე",text:"ვაკეში მშვიდი სამუშაო სივრცე ხომ არ იცით, სადაც შეხვედრის ჩატარებაც შეიძლება?",likes:18,comments:9,color:"violet"},
 {id:2,author:"ლუკა კ.",initial:"ლ",time:"35 წუთის წინ",topic:"ჩემი უბანი",location:"თბილისი · საბურთალო",text:"კვირას ჩვენს ეზოში წიგნების პატარა გაცვლა გვექნება. ვისაც გინდათ, მოიტანეთ ერთი წიგნი და აირჩიეთ სხვა.",likes:42,comments:14,color:"blue"},
 {id:3,author:"მარიამ გ.",initial:"მ",time:"1 საათის წინ",topic:"დახმარება",location:"ბათუმი",text:"ვეძებ მოხალისეებს სანაპიროს დასუფთავების პატარა ინიციატივისთვის. შევიკრიბებით შაბათს დილით.",likes:67,comments:23,color:"green"},
 {id:4,author:"გიორგი ა.",initial:"გ",time:"2 საათის წინ",topic:"ცხოვრების სტილი",location:"ქუთაისი",text:"რომელი ადგილობრივი მცირე ბრენდის პროდუქტი აღმოგიჩენიათ ბოლო დროს და სხვასაც ურჩევდით?",likes:31,comments:18,color:"orange"},
];
const groups=[
 {icon:"⌂",name:"ვაკის მეზობლები",members:"2.4K წევრი",type:"ადგილობრივი"},
 {icon:"✦",name:"თბილისი — ახალი ადგილები",members:"8.1K წევრი",type:"აღმოჩენები"},
 {icon:"♻",name:"მწვანე საქართველო",members:"5.7K წევრი",type:"ინიციატივები"},
];

export default function CommunityWorkspace(){
 const[active,setActive]=useState("ყველა");const[liked,setLiked]=useState<number[]>([]);
 const visible=useMemo(()=>posts.filter(p=>active==="ყველა"||p.topic===active),[active]);
 const toggle=(id:number)=>setLiked(x=>x.includes(id)?x.filter(n=>n!==id):[...x,id]);
 return <main className="community-main">
  <section className="community-welcome"><div><span>JIBU COMMUNITY</span><h1>ადამიანები, იდეები<br/>და შენი ქალაქი.</h1><p>იკითხე, გაუზიარე გამოცდილება და აღმოაჩინე საინტერესო ადამიანები შენს გარშემო.</p></div><div className="community-pulse"><div><span className="pulse-avatar violet">ნ</span><span className="pulse-avatar blue">ლ</span><span className="pulse-avatar green">მ</span><span className="pulse-avatar orange">გ</span></div><strong>საზოგადოება ახლა აქტიურია</strong><small>დღეს 126 ახალი საუბარი დაიწყო</small></div></section>
  <div className="community-layout">
   <section className="community-feed">
    <div className="community-compose"><span className="compose-avatar">შ</span><button>რას გაუზიარებ საზოგადოებას?</button><div><button><Icon name="location" size={17}/> მდებარეობა</button><button>＋ პოსტის შექმნა</button></div></div>
    <div className="community-topics">{topics.map(t=><button className={active===t?"active":""} onClick={()=>setActive(t)} key={t}>{t}</button>)}</div>
    <div className="community-feed-head"><h2>საზოგადოების ამბები</h2><button>უახლესი ⌄</button></div>
    <div className="community-post-list">{visible.map(post=><article className="community-post" key={post.id}>
     <header><span className={`post-avatar ${post.color}`}>{post.initial}</span><div><strong>{post.author}</strong><small>{post.time} · {post.location}</small></div><button aria-label="დამატებითი მოქმედებები">•••</button></header>
     <span className="post-topic">{post.topic}</span><p>{post.text}</p>
     <footer><button className={liked.includes(post.id)?"liked":""} onClick={()=>toggle(post.id)}><Icon name="heart" size={18}/>{post.likes+(liked.includes(post.id)?1:0)}</button><button>◯ {post.comments} კომენტარი</button><button>გაზიარება</button></footer>
    </article>)}</div>
   </section>
   <aside className="community-side">
    <section className="community-nearby"><header><span><Icon name="location" size={18}/></span><div><small>შენს გარშემო</small><h2>ადგილობრივი ჯგუფები</h2></div></header><div>{groups.map(group=><article key={group.name}><span>{group.icon}</span><div><strong>{group.name}</strong><small>{group.type} · {group.members}</small></div><button>შეუერთდი</button></article>)}</div><button className="view-groups">ყველა ჯგუფის ნახვა</button></section>
    <section className="community-guidelines"><span><Icon name="users" size={20}/></span><div><h3>კარგი საზოგადოება ჩვენგან იწყება</h3><p>იყავი კეთილგანწყობილი, პატივი ეცი სხვებს და გააზიარე სასარგებლო ინფორმაცია.</p></div></section>
   </aside>
  </div>
 </main>
}
