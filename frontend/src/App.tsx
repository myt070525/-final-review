import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import SubjectDetail from "./pages/SubjectDetail";
import Upload from "./pages/Upload";
import QuestionBank from "./pages/QuestionBank";
import QuizSetup from "./pages/QuizSetup";
import QuizPractice from "./pages/QuizPractice";
import QuizResult from "./pages/QuizResult";
import QuizHistory from "./pages/QuizHistory";
import WrongQuestions from "./pages/WrongQuestions";
import WeaknessDiagnosis from "./pages/WeaknessDiagnosis";
import JavaReview from "./pages/JavaReview";
import JavaRunner from "./pages/JavaRunner";
import JavaLearningPath from "./pages/JavaLearningPath";
import JavaMockExam from "./pages/JavaMockExam";
import JavaMockResult from "./pages/JavaMockResult";
import AnswerBank from "./pages/AnswerBank";
import Bookmarks from "./pages/Bookmarks";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/subject/:id" element={<SubjectDetail />} />
          <Route path="/subject/:id/upload" element={<Upload />} />
          <Route path="/subject/:id/questions" element={<QuestionBank />} />
          <Route path="/subject/:id/answers" element={<AnswerBank />} />
          <Route path="/subject/:id/quiz" element={<QuizSetup />} />
          <Route path="/subject/:id/java/review" element={<JavaReview />} />
          <Route path="/subject/:id/java/runner" element={<JavaRunner />} />
          <Route path="/subject/:id/java/path" element={<JavaLearningPath />} />
          <Route path="/subject/:id/java/mock-exam" element={<JavaMockExam />} />
          <Route path="/quiz/:sessionId" element={<QuizPractice />} />
          <Route path="/quiz/:sessionId/result" element={<QuizResult />} />
          <Route path="/quiz/:sessionId/mock-result" element={<JavaMockResult />} />
          <Route path="/history" element={<QuizHistory />} />
          <Route path="/wrong-questions" element={<WrongQuestions />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/weakness-diagnosis" element={<WeaknessDiagnosis />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
