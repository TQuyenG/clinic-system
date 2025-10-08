// client/src/components/layout/MainLayout.js
import React from 'react';
import Header from '../common/Header';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import Chatbot from '../common/Chatbot';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <Header />
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
};

export default MainLayout;

