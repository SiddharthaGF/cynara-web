import type { JSX } from 'react';

import './App.css';

function App(): JSX.Element {
  return (
    <main className='app'>
      <h1>Cynara Web</h1>
      <p>
        Configurable clinical platform for hospitals. This app renders forms
        defined by the{' '}
        <a
          href='https://github.com/ailuracode/cynara/blob/main/docs/clinical-form-schema.md'
          target='_blank'
          rel='noreferrer'
        >
          clinical form schema contract
        </a>
        .
      </p>
    </main>
  );
}

export default App;
