"use client";

import Link from "next/link";
import { FC } from "react";

export const LinkPage: FC = () => {
  const cards = [
    { href: "/furniset", title: "Furniset", subtitle: "Інтелектуальні меблі" },
    { href: "/green-house", title: "Green House", subtitle: "Тепличні системи" },
    { href: "/test", title: "Test", subtitle: "Тестове середовище" },
  ];

  return (
    <div className="bg-white min-vh-100 py-5">
      <div className="container">
        <div className="row g-4 justify-content-center">
          {cards.map(({ href, title, subtitle }) => (
            <div key={href} className="col-12 col-sm-6 col-lg-4">
              <Link
                href={href}
                className="card-hover d-block p-4 rounded-4 shadow-sm border border-light bg-white text-decoration-none h-100"
              >
                <div className="d-flex flex-column justify-content-between h-100">
                  <div>
                    <h5 className="fw-bold text-dark mb-2">{title}</h5>
                    <p className="text-muted small">{subtitle}</p>
                  </div>
                  <div className="text-end mt-3">
                    <span className="text-primary fw-semibold">Перейти →</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .card-hover {
          transition: all 0.3s ease-in-out;
        }

        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 140, 255, 0.1);
        }

        .card-hover span {
          transition: color 0.3s ease-in-out;
        }

        .card-hover:hover span {
          color: #007bff;
        }
      `}</style>
    </div>
  );
};
