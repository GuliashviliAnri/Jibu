import {Header,Icon,Sidebar} from "../../page";
import VipBrokerActivation from "./VipBrokerActivation";
export const metadata={title:"VIP Broker | JIBU"};
const benefits=[
 ["01","პირადი ქონების ცხრილი","ობიექტები, ნომრები, ფასი, საკომისიო და შენიშვნები ერთ დაცულ სამუშაო სივრცეში."],
 ["02","ერთი დაჭერით დამატება","JIBU-ს ნებისმიერი განცხადება გადაიტანე შენს ცხრილში ინფორმაციის ხელით გადაწერის გარეშე."],
 ["03","რეალური ანალიტიკა","ნახე ჯამური ნახვები, დაინტერესება და თითოეული განცხადების შედეგი."],
 ["04","პორტფელის ექსპორტი","ჩამოტვირთე შენს მიერ შეგროვებული ქონებები Excel-თან თავსებად ფორმატში."],
 ["05","პროფესიონალური სტატუსი","წარმოაჩინე თავი როგორც აქტიური ბროკერი და გააძლიერე მომხმარებლის ნდობა."],
 ["06","ახალი პროფესიული ხელსაწყოები","მიიღე ბროკერებისთვის შექმნილი შემდეგი ფუნქციები მათი დამატებისთანავე."],
];
export default function VipBrokerPage(){return <div className="app-shell real-estate-shell"><Sidebar active="real-estate"/><div className="page"><Header/><main className="vip-broker-page vip-broker-v2"><nav className="detail-breadcrumb"><a href="/real-estate">უძრავი ქონება</a><span>/</span><b>VIP Broker</b></nav>
 <section className="vip2-hero" id="vip-plan"><div className="vip2-copy"><span><Icon name="crown" size={16}/> JIBU PROFESSIONAL</span><h1>შენი უძრავი ქონების<br/>სამუშაო სივრცე.</h1><p>ნაკლები დრო ინფორმაციის შეგროვებაზე, მეტი კონტროლი პორტფელსა და კლიენტებზე.</p><VipBrokerActivation/><div className="vip2-trust"><span>✓ გაუქმება ნებისმიერ დროს</span><span>✓ მონაცემები პირადია</span></div></div>
  <aside className="vip2-plan"><header><span>VIP BROKER</span><small>პროფესიონალური წვდომა</small></header><div className="vip2-price"><strong>19.99</strong><span>₾<small>/ 30 დღე</small></span></div><ul><li>პირადი Excel სივრცე</li><li>განცხადებების სწრაფი დამატება</li><li>პორტფელის ანალიტიკა</li><li>მონაცემების ექსპორტი</li></ul><div className="vip2-plan-note">ყველა მთავარი ინსტრუმენტი აქტიურდება 30 დღით</div></aside>
 </section>
 <section className="vip2-proof"><div><strong>1 სივრცე</strong><span>მთელი პორტფელისთვის</span></div><div><strong>1 დაჭერა</strong><span>ქონების შესანახად</span></div><div><strong>24/7</strong><span>წვდომა ნებისმიერი მოწყობილობიდან</span></div></section>
 <section className="vip2-benefits-head"><span>რას იღებ წევრობით</span><h2>ბროკერისთვის საჭირო ყველაფერი</h2><p>მარტივი ხელსაწყოები, რომლებიც ყოველდღიურ მუშაობას აჩქარებს და ინფორმაციას წესრიგში ინახავს.</p></section>
 <section className="broker-benefit-grid vip2-benefit-grid">{benefits.map(([n,title,text])=><article key={n}><b>{n}</b><span className="vip2-check">✓</span><h2>{title}</h2><p>{text}</p></article>)}</section>
 <section className="vip2-bottom"><div><span>JIBU VIP BROKER</span><h2>მზად ხარ უფრო ორგანიზებულად იმუშაო?</h2><p>გააქტიურე პროფესიონალური სივრცე 30 დღით და მართე შენი ქონებები ერთ ადგილას.</p></div><div><strong>19.99 ₾</strong><small>30 დღე</small><a href="#vip-plan">წვდომის გააქტიურება</a></div></section>
 </main></div></div>}
