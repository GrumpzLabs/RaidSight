const input = document.querySelector('#video-input');
const dropzone = document.querySelector('#dropzone');
const title = document.querySelector('#upload-title');
const copy = document.querySelector('#upload-copy');
const analyze = document.querySelector('#analyze-button');
const toast = document.querySelector('#toast');
const results = document.querySelector('#history');

function renderReport(job) {
  const data = job.report;
  results.querySelector('.eyebrow').innerHTML = `LATEST REVIEW <span class="status-pill">JUST ANALYZED</span>`;
  results.querySelector('h2').textContent = data.encounter;
  results.querySelector('.duration').innerHTML = `${data.duration} <small>run length</small>`;
  results.querySelector('.score-block strong').textContent = data.highImpactMoments;
  results.querySelector('.score-block > span:not(.score-label)').textContent = 'high-impact moments';
  const timeline = results.querySelector('.timeline');
  timeline.innerHTML = data.findings.map(item => `
    <div class="timeline-item">
      <span class="time">${item.timestamp}</span>
      <div class="marker ${item.tone}"></div>
      <div><b>${item.title}</b><p>${item.explanation}</p><span class="tag ${item.category === 'GOOD HABIT' ? 'positive' : ''}">${item.category}</span></div>
    </div>`).join('');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectFile(file) {
  if (!file) return;
  if (!file.type.startsWith('video/')) return showToast('Please choose a video file.');
  title.textContent = file.name;
  copy.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to review`;
  analyze.disabled = false;
  dropzone.classList.add('dragging');
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
input.addEventListener('change', e => selectFile(e.target.files[0]));
['dragenter', 'dragover'].forEach(event => dropzone.addEventListener(event, e => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(event => dropzone.addEventListener(event, e => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', e => selectFile(e.dataTransfer.files[0]));
document.querySelector('#link-button').addEventListener('click', () => {
  const value = document.querySelector('#log-url').value.trim();
  if (!value) return showToast('Paste a Warcraft Logs URL first.');
  showToast('Log linked. Add a recording to start the review.');
});
analyze.addEventListener('click', async () => {
  const file = input.files[0];
  if (!file) return showToast('Choose a recording first.');
  analyze.disabled = true;
  analyze.querySelector('span').textContent = 'Uploading your run…';
  const body = new FormData();
  body.append('video', file);
  body.append('logUrl', document.querySelector('#log-url').value.trim());
  try {
    const created = await fetch('/api/reviews', { method: 'POST', body }).then(r => r.json());
    if (!created.id) throw new Error(created.error || 'Upload failed');
    analyze.querySelector('span').textContent = 'Analyzing your run…';
    const poll = async () => {
      const job = await fetch(`/api/reviews/${created.id}`).then(r => r.json());
      if (job.status === 'complete') {
        renderReport(job);
        analyze.querySelector('span').textContent = 'Review ready';
        analyze.disabled = false;
        showToast('Your review is ready below.');
        return;
      }
      setTimeout(poll, 500);
    };
    poll();
  } catch (error) {
    analyze.disabled = false;
    analyze.querySelector('span').textContent = 'Analyze my run';
    showToast(error.message);
  }
});
