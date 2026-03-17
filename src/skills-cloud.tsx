import { createRoot } from "react-dom/client"
import { IconCloud } from "./components/ui/interactive-icon-cloud"

// Manish's actual tech stack slugs from simpleicons.org
const slugs = [
  "typescript",
  "javascript",
  "react",
  "nextdotjs",
  "nodedotjs",
  "python",
  "fastapi",
  "mongodb",
  "redis",
  "postgresql",
  "docker",
  "amazonwebservices",
  "stripe",
  "wordpress",
  "php",
  "openai",
  "supabase",
  "reactquery",
]

export function initSkillsCloud() {
  const mount = document.getElementById("skills-cloud")
  if (!mount) return
  const root = createRoot(mount)
  root.render(<IconCloud iconSlugs={slugs} />)
}
