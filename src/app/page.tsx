import { Fragment } from 'react';
import EntryForm from '@/components/EntryForm';
import Faq from '@/components/Faq';
import { CAREER, JOBS, SESSIONS, SHIFTS, STANCES, SUPPORTS, VOICES } from '@/data/content';

const img = (name: string) => `/images/${name}.webp`;

function SecHead({ no, en, children, tone = 'light' }: { no: string; en: string; children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <div className={`sec-head sec-head--${tone}`}>
      <span className="sec-head__no" aria-hidden="true">{no}</span>
      <p className="sec-head__en">{en}</p>
      <h2 className="sec-head__ja">{children}</h2>
    </div>
  );
}

function ArrowButton({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a className={`arrow-btn ${className}`} href={href}>
      <span className="arrow-btn__label">{children}</span>
    </a>
  );
}

export default function Page() {
  return (
    <>
      <div className="top-band" aria-hidden="true" />
      <main id="top">
        {/* ===== FV ===== */}
        <section className="fv" aria-labelledby="fv-title">
          <div className="fv__deco" aria-hidden="true" />
          <div className="fv__inner">
            <p className="fv__en">2028 / 2029 GRADUATE RECRUITING</p>
            <p className="fv__target">2028・29年卒向け 新卒採用</p>
            <p className="fv__badge">特別選考あり</p>
            <h1 className="fv__title" id="fv-title">
              お菓子の<br />
              <span className="fv__key">先</span>にある、<br />
              幸せを<br />
              届ける仕事。
            </h1>
            <p className="fv__lead">
              つくる人、届ける人、支える人。<br />
              一人ひとりの仕事が、誰かの喜びへつながっていく。
            </p>
            <ArrowButton href="#schedule" className="fv__cta">説明会の日時を確認する</ArrowButton>
          </div>
        </section>

        {/* ===== 写真 ===== */}
        <div className="collage" aria-hidden="true">
          <div className="collage__inner">
            <figure className="collage__ph collage__ph--team"><img src={img('photo-team')} alt="" loading="eager" decoding="async" /></figure>
            <figure className="collage__ph collage__ph--piping"><img src={img('photo-piping')} alt="" decoding="async" /></figure>
            <figure className="collage__ph collage__ph--chanoka"><img src={img('photo-chanoka')} alt="" decoding="async" /></figure>
          </div>
        </div>

        {/* ===== 01 OUR WORK ===== */}
        <section className="work" id="work" aria-labelledby="work-title">
          <div className="work__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="01" en="OUR WORK">
              <span id="work-title">ロマンライフの<br />仕事とは</span>
            </SecHead>
            <h3 className="work__catch">
              お菓子の先にある、<br />
              <span className="work__catch-gold">人のしあわせ</span><br />
              をつくる。
            </h3>
            <p className="work__lead">
              商品をつくるだけではなく、店で過ごす時間や、誰かに贈るときの気持ちまで考える。異なる仕事が手をつなぎ、ブランドへの信頼を育てています。
            </p>
            <figure className="photo-card work__photo">
              <img src={img('photo-bread')} alt="店頭でお客様に焼き菓子をご案内するスタッフ" loading="lazy" decoding="async" />
              <figcaption>喜びを、次の人へ。</figcaption>
            </figure>
            <ul className="jobs">
              {JOBS.map((j) => (
                <li className="job" key={j.title}>
                  <img className="job__img" src={img(j.img)} alt="" loading="lazy" decoding="async" />
                  <div className="job__body">
                    <h3 className="job__title">{j.title}</h3>
                    <p className="job__text">{j.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== 02 WHO WE ARE LOOKING FOR ===== */}
        <section className="looking" id="looking" aria-labelledby="looking-title">
          <div className="looking__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="02" en="WHO WE ARE LOOKING FOR" tone="dark">
              <span id="looking-title">こんな人に<br />向いている</span>
            </SecHead>
            <div className="looking__lead">
              <p>特別な経験よりも、</p>
              <p className="gold">誰かを喜ばせたい</p>
              <p className="gold">気持ち。</p>
              <p>ロマンライフで働く人の言葉から、4つの姿勢を紹介します。</p>
            </div>
            <ol className="stances">
              {STANCES.map((s) => (
                <li className="stance" key={s.no}>
                  <div className="stance__ph">
                    <img src={img(s.img)} alt="" loading="lazy" decoding="async" />
                    <span className="stance__no" aria-hidden="true">{s.no}</span>
                  </div>
                  <div className="stance__body">
                    <h3 className="stance__title">{s.title}</h3>
                    <p className="stance__text">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===== 03 NUMBERS ===== */}
        <section className="numbers" id="numbers" aria-labelledby="numbers-title">
          <div className="numbers__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="03" en="ROMANLIFE IN NUMBERS">
              <span id="numbers-title">数字で見る<br />ロマンライフ</span>
            </SecHead>
            <div className="numbers__card">
              <div className="num num--ratio">
                <span className="num__icon num__icon--person" aria-hidden="true" />
                <h3 className="num__label">男女比</h3>
                <p className="num__value">
                  <span className="num__big">3</span>
                  <span className="num__colon">:</span>
                  <span className="num__big">7</span>
                </p>
                <p className="num__note">男性：女性</p>
              </div>
              <div className="num num--holiday">
                <span className="num__icon num__icon--calendar" aria-hidden="true" />
                <h3 className="num__label">年間休日</h3>
                <p className="num__value">
                  <span className="num__big">121</span>
                  <span className="num__unit">日</span>
                </p>
                <p className="num__note">8連休・4連休を含む</p>
              </div>
              <div className="num num--bonus">
                <span className="num__icon num__icon--crown" aria-hidden="true" />
                <h3 className="num__label">賞与</h3>
                <p className="num__value">
                  <span className="num__big">4.2</span>
                  <span className="num__unit">か月</span>
                </p>
                <p className="num__note">前期支給実績／今期3か月予定</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 04 PEOPLE ===== */}
        <section className="people" id="people" aria-labelledby="people-title">
          <div className="people__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="04" en="PEOPLE" tone="dark">
              <span id="people-title">社員の声</span>
            </SecHead>
            <p className="people__lead">人の魅力が、ロマンライフで働く理由になる。</p>
            <ul className="voices">
              {VOICES.map((v) => (
                <li className="voice" key={v.year}>
                  <img className="voice__img" src={img(v.img)} alt="" loading="lazy" decoding="async" />
                  <div className="voice__body">
                    <p className="voice__year">{v.year}</p>
                    <h3 className="voice__title">
                      {v.title[0]}<br />{v.title[1]}
                    </h3>
                    <p className="voice__text">{v.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== 05 A DAY AT WORK ===== */}
        <section className="day" id="day" aria-labelledby="day-title">
          <div className="day__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="05" en="A DAY AT WORK">
              <span id="day-title">実際の1日</span>
            </SecHead>
            <div className="shifts">
              {SHIFTS.map((s, i) => (
                <div className="shift" key={s.title}>
                  <h3 className="shift__title">{s.title}</h3>
                  <p className="shift__time">{s.time}</p>
                  <dl className="shift__list">
                    {s.rows.map(([t, d]) => (
                      <div className="shift__row" key={t}>
                        <dt>{t}</dt>
                        <dd>{d}</dd>
                      </div>
                    ))}
                  </dl>
                  {i === SHIFTS.length - 1 && <p className="shift__note">※配属店舗や勤務シフトにより異なります。</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 06 CAREER PATH ===== */}
        <section className="career" id="career" aria-labelledby="career-title">
          <div className="career__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="06" en="CAREER PATH" tone="dark">
              <span id="career-title">キャリア設計</span>
            </SecHead>
            <p className="career__catch">
              現場で得た視点が、<br />次の仕事へ<br />つながる。
            </p>
            <ol className="steps">
              {CAREER.map(([when, what], i) => (
                <li className={`step step--${i + 1}`} key={when}>
                  <span className="step__when">{when}</span>
                  <span className="step__what">{what}</span>
                </li>
              ))}
            </ol>
            <p className="career__note">※異動により複数店舗を経験しながらリーダーを目指す一例です。</p>
          </div>
        </section>

        {/* ===== 07 GROWTH & SUPPORT ===== */}
        <section className="growth" id="growth" aria-labelledby="growth-title">
          <div className="growth__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="07" en="GROWTH &amp; SUPPORT">
              <span id="growth-title">成長できる<br />環境</span>
            </SecHead>
            <figure className="photo-card growth__photo">
              <img src={img('photo-meeting')} alt="会議室で研修を受ける社員" loading="lazy" decoding="async" />
              <figcaption>
                <mark>仲間</mark>と学び、次の挑戦へ。
              </figcaption>
            </figure>
            <dl className="supports">
              {SUPPORTS.map((s) => (
                <div className="support" key={s.title}>
                  <dt>{s.title}</dt>
                  <dd>
                    {s.body.map((b, i) => (
                      <Fragment key={i}>{typeof b === 'string' ? b : <mark>{b.mark}</mark>}</Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ===== 08 OPEN COMPANY ===== */}
        <section className="schedule" id="schedule" aria-labelledby="schedule-title">
          <div className="schedule__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="08" en="OPEN COMPANY" tone="dark">
              <span id="schedule-title">説明会の<br />日時</span>
            </SecHead>
            <h3 className="schedule__title">秋のオープンカンパニー</h3>
            <p className="schedule__lead">
              以下の日時にて、秋のオープンカンパニーを実施する予定です。会社概要やお仕事についての説明はもちろん、今回は先輩社員にも来てもらう予定でプログラムを組んでおります。
            </p>
            <ul className="dates">
              {SESSIONS.map((s) => (
                <li className="date" key={s.id}>
                  <p className="date__head">
                    <span className="date__day">{s.date}</span>
                    <span className={`date__week${s.week.length > 1 ? ' date__week--wide' : ''}`}>{s.week}</span>
                  </p>
                  <p className="date__time">{s.time}</p>
                </li>
              ))}
            </ul>
            <ArrowButton href="#entry" className="schedule__cta">説明会に申し込む</ArrowButton>
          </div>
        </section>

        {/* ===== 09 FAQ ===== */}
        <section className="faq" id="faq" aria-labelledby="faq-title">
          <div className="faq__deco" aria-hidden="true" />
          <div className="inner">
            <SecHead no="09" en="FAQ">
              <span id="faq-title">よくある<br />ご質問</span>
            </SecHead>
            <Faq />
          </div>
        </section>

        {/* ===== ENTRY ===== */}
        <section className="entry" id="entry" aria-labelledby="entry-title">
          <div className="entry__deco" aria-hidden="true" />
          <div className="inner">
            <p className="entry__en" aria-hidden="true">ENTRY</p>
            <h2 className="entry__title" id="entry-title">
              あなたの手から、<br />次のしあわせへ。
            </h2>
            <p className="entry__sub">28・29卒向け説明会エントリーフォーム</p>
            <EntryForm webhookConfigured={Boolean(process.env.ENTRY_WEBHOOK_URL)} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__deco" aria-hidden="true" />
        <div className="inner">
          <a className="footer__logo" href="#top">
            <img src="/images/logo-romanlife.png" width="202" height="73" alt="喜びをリレーする ROMANLIFE" loading="lazy" decoding="async" />
          </a>
          <p className="footer__copy">
            <small>© ROMANLIFE Co., Ltd.</small>
          </p>
        </div>
      </footer>
      <div className="bottom-band" aria-hidden="true" />
    </>
  );
}
