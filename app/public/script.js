// ---- Runbook data: add or edit runbooks here ----
const RUNBOOKS = [
  {
    id: "server-down",
    title: "Server Down",
    severity: "SEV1",
    category: "Infrastructure",
    time: "15 min",
    summary: "The site or API is not responding for users.",
    steps: [
      "Confirm the outage from outside your own network.",
      "Check the VM or instance status in the cloud console.",
      "Review recent deployments and changes.",
      "Restart the service and watch the logs.",
      "Post an update in the incident channel and note the timeline."
    ],
    commands: [
      "curl -i https://your-site/health",
      "kubectl get pods",
      "kubectl logs deployment/runbook-deployment --tail=50"
    ],
    escalate: "No recovery in 15 minutes? Page the on-call engineer."
  },
  {
    id: "db-connection",
    title: "Database Connection Errors",
    severity: "SEV1",
    category: "Database",
    time: "25 min",
    summary: "The app cannot reach the database or connections are exhausted.",
    steps: [
      "Check that the database instance is running.",
      "Test network access from the app to the database port.",
      "Check for too many open connections.",
      "Verify credentials or secrets were not changed or expired.",
      "Restart the app pods once the database is healthy."
    ],
    commands: [
      "nc -zv db-host 5432",
      "kubectl logs deployment/runbook-deployment --tail=100",
      "kubectl rollout restart deployment/runbook-deployment"
    ],
    escalate: "Data loss suspected? Escalate to the database owner immediately."
  },
  {
    id: "ssl-expired",
    title: "SSL Certificate Expired",
    severity: "SEV1",
    category: "Security",
    time: "30 min",
    summary: "Browsers show security warnings because the certificate expired.",
    steps: [
      "Confirm the expiry date of the certificate.",
      "Renew or reissue the certificate.",
      "Install the new certificate on the load balancer or ingress.",
      "Verify the full certificate chain in a browser.",
      "Add an expiry alert so this does not happen again."
    ],
    commands: [
      "openssl s_client -connect your-site:443 -servername your-site",
      "kubectl get ingress"
    ],
    escalate: "Cannot renew? Contact the security team."
  },
  {
    id: "pod-crashloop",
    title: "Pod CrashLoopBackOff",
    severity: "SEV2",
    category: "Kubernetes",
    time: "20 min",
    summary: "A pod keeps starting, crashing and restarting.",
    steps: [
      "Find the failing pod with kubectl get pods.",
      "Read the logs of the previous crashed container.",
      "Describe the pod and read the Events section.",
      "Check the image tag, environment variables and config.",
      "Roll back or fix the problem, then redeploy."
    ],
    commands: [
      "kubectl get pods",
      "kubectl logs <pod-name> --previous",
      "kubectl describe pod <pod-name>",
      "kubectl rollout undo deployment/runbook-deployment"
    ],
    escalate: "Still crashing after a rollback? Ask the app team to review."
  },
  {
    id: "deployment-failed",
    title: "Deployment Failed",
    severity: "SEV2",
    category: "CI/CD",
    time: "20 min",
    summary: "The pipeline failed or the new version did not roll out.",
    steps: [
      "Open the pipeline console output and find the failed stage.",
      "Verify the Docker image was built and pushed.",
      "Check the Kubernetes rollout status.",
      "Roll back to the last working version.",
      "Fix the cause and run the pipeline again."
    ],
    commands: [
      "kubectl rollout status deployment/runbook-deployment",
      "kubectl rollout history deployment/runbook-deployment",
      "kubectl rollout undo deployment/runbook-deployment"
    ],
    escalate: "Pipeline itself broken? Check Jenkins and its credentials."
  },
  {
    id: "high-cpu",
    title: "High CPU Usage",
    severity: "SEV2",
    category: "Performance",
    time: "20 min",
    summary: "CPU is maxed out and responses are slow.",
    steps: [
      "Find the busy process or pod.",
      "Check whether traffic suddenly increased.",
      "Look at application logs for errors or loops.",
      "Scale out or restart the affected service.",
      "Record the root cause after recovery."
    ],
    commands: [
      "top",
      "kubectl top pods",
      "kubectl scale deployment/runbook-deployment --replicas=4"
    ],
    escalate: "CPU stays high after scaling? Investigate a recent code change."
  },
  {
    id: "oom-killed",
    title: "Out of Memory (OOMKilled)",
    severity: "SEV2",
    category: "Kubernetes",
    time: "25 min",
    summary: "Containers are being killed for using too much memory.",
    steps: [
      "Confirm OOMKilled as the last state of the pod.",
      "Check current memory usage.",
      "Look for a memory leak in recent changes.",
      "Raise the memory limit as a short-term fix.",
      "Create a follow-up ticket for the real fix."
    ],
    commands: [
      "kubectl describe pod <pod-name>",
      "kubectl top pods",
      "kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].lastState}'"
    ],
    escalate: "Repeated kills? Ask the app team to profile memory usage."
  },
  {
    id: "disk-full",
    title: "Disk Full",
    severity: "SEV2",
    category: "Infrastructure",
    time: "15 min",
    summary: "A server has run out of disk space.",
    steps: [
      "Check which disk or mount is full.",
      "Find the largest folders.",
      "Remove old logs and unused Docker images safely.",
      "Confirm the service is healthy again.",
      "Set up a disk usage alert."
    ],
    commands: [
      "df -h",
      "du -sh /var/* | sort -h",
      "docker system prune -f"
    ],
    escalate: "Never delete data you are unsure about. Ask first."
  },
  {
    id: "slow-response",
    title: "Slow Response Times",
    severity: "SEV3",
    category: "Performance",
    time: "30 min",
    summary: "Pages load slowly but the site is still up.",
    steps: [
      "Measure the response time from your machine.",
      "Check pod CPU and memory usage.",
      "Look at recent deployments for a regression.",
      "Scale up if traffic is higher than usual.",
      "Open a ticket for a deeper investigation."
    ],
    commands: [
      "curl -o /dev/null -s -w \"%{time_total}\\n\" https://your-site/",
      "kubectl top pods"
    ],
    escalate: "Getting worse? Raise it to SEV2."
  }
];

// ---- Saved checklist progress (in the browser) ----
const STORAGE_KEY = "runbook-progress-v1";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    // storage not available, progress just won't be saved
  }
}

let progress = loadProgress();
let activeSeverity = "ALL";
let searchText = "";

// ---- Helpers ----
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function doneCount(rb) {
  const saved = progress[rb.id] || [];
  return rb.steps.filter((_, i) => saved[i]).length;
}

function matches(rb) {
  if (activeSeverity !== "ALL" && rb.severity !== activeSeverity) return false;
  if (!searchText) return true;
  const haystack = [rb.title, rb.category, rb.summary, ...rb.steps, ...rb.commands]
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchText);
}

function copyText(text, button) {
  const finish = () => {
    button.textContent = "Copied!";
    button.classList.add("done");
    setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("done");
    }, 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(finish).catch(() => {});
  }
}

// ---- Build one runbook card ----
function buildCard(rb) {
  const card = el("details", "runbook");

  const summary = el("summary");
  const titleRow = el("div", "title-row");
  titleRow.appendChild(el("span", "title", rb.title));
  titleRow.appendChild(el("span", "badge " + rb.severity, rb.severity));
  titleRow.appendChild(el("span", "tag", rb.category + " \u00B7 ~" + rb.time));
  summary.appendChild(titleRow);
  summary.appendChild(el("div", "summary-text", rb.summary));

  const progressRow = el("div", "progress-row");
  const bar = el("div", "bar");
  const fill = el("span");
  bar.appendChild(fill);
  const progressText = el("span", "progress-text");
  progressRow.appendChild(bar);
  progressRow.appendChild(progressText);
  summary.appendChild(progressRow);
  card.appendChild(summary);

  function updateProgress() {
    const done = doneCount(rb);
    fill.style.width = (done / rb.steps.length) * 100 + "%";
    progressText.textContent = done + "/" + rb.steps.length;
  }

  const body = el("div", "body");

  body.appendChild(el("h4", null, "Steps"));
  const list = el("ul", "steps");
  rb.steps.forEach((step, i) => {
    const li = el("li");
    const label = el("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = !!(progress[rb.id] && progress[rb.id][i]);
    box.addEventListener("change", () => {
      const saved = progress[rb.id] || [];
      saved[i] = box.checked;
      progress[rb.id] = saved;
      saveProgress(progress);
      updateProgress();
    });
    label.appendChild(box);
    label.appendChild(el("span", null, step));
    li.appendChild(label);
    list.appendChild(li);
  });
  body.appendChild(list);

  body.appendChild(el("h4", null, "Useful commands"));
  rb.commands.forEach((cmd) => {
    const row = el("div", "cmd");
    row.appendChild(el("code", null, cmd));
    const btn = el("button", "copy", "Copy");
    btn.addEventListener("click", () => copyText(cmd, btn));
    row.appendChild(btn);
    body.appendChild(row);
  });

  body.appendChild(el("div", "escalate", "Escalation: " + rb.escalate));
  card.appendChild(body);

  updateProgress();
  return card;
}

// ---- Render the list ----
function render() {
  const container = document.getElementById("runbooks");
  container.textContent = "";
  const visible = RUNBOOKS.filter(matches);
  visible.forEach((rb) => container.appendChild(buildCard(rb)));
  document.getElementById("count").textContent =
    "Showing " + visible.length + " of " + RUNBOOKS.length + " runbooks";
  document.getElementById("empty").hidden = visible.length > 0;
}

// ---- Events ----
document.getElementById("search").addEventListener("input", (e) => {
  searchText = e.target.value.trim().toLowerCase();
  render();
});

document.getElementById("filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  activeSeverity = chip.dataset.sev;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  render();
});

document.getElementById("reset").addEventListener("click", () => {
  progress = {};
  saveProgress(progress);
  render();
});

render();
