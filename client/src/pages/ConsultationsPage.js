// client/src/pages/ConsultationsPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ConsultationHomePage from './ConsultationHomePage';

/**
 * ConsultationsPage - Wrapper component cho ConsultationHomePage
 * Redirect route /consultations đến ConsultationHomePage
 */
const ConsultationsPage = () => {
  return <ConsultationHomePage />;
};

export default ConsultationsPage;