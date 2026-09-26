import { ActionCode } from "../engine/types";

const HUMAN: Record<ActionCode, string> = {
  ack_emotion: "назвал(а) ваше состояние вслух",
  firm_respect: "твёрдо, но уважительно удержал(а) позицию",
  open_question: "задал(а) открытый вопрос",
  specific_recognition: "конкретно признал(а) вашу работу",
  offer_options: "предложил(а) варианты",
  objective_criteria: "сослался(лась) на факты и данные",
  commit_fix: "зафиксировал(а) договорённость с конкретикой",
  apology: "признал(а) свою ошибку",
  postpone_with_deadline: "отложил(а) решение, но назвал(а) срок",
  postpone_no_deadline: "отложил(а) решение без срока",
  postpone_repeat: "второй раз отложил(а) решение",
  blame: "обвинил(а) вас",
  pressure: "надавил(а)",
  ignore_emotion: "проигнорировал(а) ваше состояние",
  mirror_aggression: "ответил(а) резкостью на резкость",
  direct_criticism: "раскритиковал(а) без опоры на факты",
  softness_no_substance: "успокоил(а), не предложив ничего конкретного",
  small_talk: "сказал(а) что-то не по существу",
  clarify_fact: "уточнил(а) факт",
  off_topic: "ушёл(ушла) от темы",
};

export function humanizeActions(actions: ActionCode[]): string {
  return actions.map((a) => HUMAN[a]).join(", ");
}
